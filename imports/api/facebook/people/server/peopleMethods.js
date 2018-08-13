import SimpleSchema from "simpl-schema";
import axios from "axios";
import { People, PeopleTags } from "../people.js";
import { DeauthorizedPeople } from "../deauthorizedPeople.js";
import peopleMetaModel from "/imports/api/facebook/people/model/meta";
import { PeopleHelpers } from "./peopleHelpers.js";
import { Campaigns } from "/imports/api/campaigns/campaigns.js";
import { flattenObject } from "/imports/utils/common.js";
import _ from "underscore";
import { get, set, merge, pick, compact, uniq } from "lodash";
import cep from "cep-promise";
import { Random } from "meteor/random";

const recaptchaSecret = Meteor.settings.recaptcha;

export const resolveZipcode = new ValidatedMethod({
  name: "people.resolveZipcode",
  validate: new SimpleSchema({
    country: {
      type: String
    },
    zipcode: {
      type: String
    }
  }).validator(),
  run({ country, zipcode }) {
    this.unblock();

    switch (country) {
      case "BR":
        const match = zipcode.match(/\d+/gi);
        if (match && match.length) {
          const code = match.join("");
          if (code.length == 8) {
            return Promise.await(cep(code));
          }
        }
        return {};
      default:
        let res;
        let data = {};
        try {
          res = Promise.await(
            axios.get(`http://api.zippopotam.us/${country}/${zipcode}`)
          );
          data = res.data;
        } catch (e) {
          return data;
        } finally {
          if (data && data.places && data.places.length) {
            return {
              state: data.places[0]["state abbreviation"],
              city: data.places[0]["place name"]
            };
          }
          return data;
        }
    }
  }
});

const buildSearchQuery = ({ campaignId, query, options }) => {
  let queryOptions = {
    skip: options.skip || 0,
    limit: Math.min(options.limit || 10, 50),
    fields: {
      name: 1,
      facebookId: 1,
      campaignId: 1,
      counts: 1,
      campaignMeta: 1,
      lastInteractionDate: 1,
      filledForm: 1,
      formId: 1,
      createdAt: 1
    }
  };

  if (options.sort) {
    switch (options.sort) {
      case "comments":
      case "likes":
        if (options.facebookId) {
          queryOptions.sort = {
            [`counts.${options.facebookId}.${options.sort}`]: -1
          };
        }
        break;
      case "name":
        queryOptions.sort = { name: 1 };
        break;
      case "lastInteraction":
        if (options.facebookId) {
          queryOptions.sort = {
            lastInteractionDate: -1
          };
        }
        break;
      default:
    }
  }

  query.campaignId = campaignId;

  if (query.q) {
    query.$text = { $search: query.q };
    if (!queryOptions.sort) {
      queryOptions.fields.score = { $meta: "textScore" };
      queryOptions.sort = { score: { $meta: "textScore" } };
    }
  }
  delete query.q;

  switch (query.accountFilter) {
    case "account":
      if (options.facebookId) {
        query.facebookAccounts = options.facebookId;
      }
      break;
    case "import":
      query.source = "import";
      break;
  }
  delete query.accountFilter;

  return { query, options: queryOptions };
};

export const peopleSearch = new ValidatedMethod({
  name: "people.search",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    query: {
      type: Object,
      blackbox: true
    },
    options: {
      type: Object,
      blackbox: true
    }
  }).validator(),
  run({ campaignId, query, options }) {
    this.unblock();
    logger.debug("people.search called", {
      campaignId,
      query,
      options
    });

    const searchQuery = buildSearchQuery({ campaignId, query, options });

    const cursor = People.find(searchQuery.query, searchQuery.options);

    const result = cursor.fetch();

    return result;
  }
});

export const peopleSearchCount = new ValidatedMethod({
  name: "people.search.count",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    query: {
      type: Object,
      blackbox: true
    },
    options: {
      type: Object,
      blackbox: true
    }
  }).validator(),
  run({ campaignId, query, options }) {
    this.unblock();
    logger.debug("people.search.count called", {
      campaignId,
      query,
      options
    });

    const searchQuery = buildSearchQuery({ campaignId, query, options });

    const result = Promise.await(
      People.rawCollection().count(searchQuery.query)
    );

    return result;
  }
});

export const updatePersonMeta = new ValidatedMethod({
  name: "facebook.people.updatePersonMeta",
  validate: new SimpleSchema({
    personId: {
      type: String
    },
    metaKey: {
      type: String
    },
    metaValue: {
      type: Match.OneOf(String, Boolean)
    }
  }).validator(),
  run({ personId, metaKey, metaValue }) {
    logger.debug("facebook.people.updatePersonMeta called", {
      personId,
      metaKey,
      metaValue
    });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const person = People.findOne(personId);

    if (!person) {
      throw new Meteor.Error(401, "Person not found");
    }

    const campaign = Campaigns.findOne(person.campaignId);

    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    let doc = {};
    doc[`campaignMeta.${metaKey}`] = metaValue;

    if (!person.formId) PeopleHelpers.generateFormId({ person });

    return People.update({ _id: person._id }, { $set: doc });
  }
});

export const getPersonIdFromFacebook = new ValidatedMethod({
  name: "people.getPersonIdFromFacebook",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    facebookId: {
      type: String
    }
  }).validator(),
  run({ campaignId, facebookId }) {
    this.unblock();

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    return People.findOne(
      {
        campaignId,
        facebookId
      },
      {
        fields: {
          _id: 1
        }
      }
    );
  }
});

export const peopleFormId = new ValidatedMethod({
  name: "people.formId",
  validate: new SimpleSchema({
    personId: {
      type: String
    },
    regenerate: {
      type: Boolean,
      optional: true
    }
  }).validator(),
  run({ personId, regenerate }) {
    logger.debug("people.formId called", { personId });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const person = People.findOne(personId);

    if (!person) {
      throw new Meteor.Error(400, "Person not found");
    }
    const campaignId = person.campaignId;

    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    let formId = person.formId;

    if (!formId || regenerate)
      formId = PeopleHelpers.generateFormId({ person });

    return {
      formId,
      filledForm: person.filledForm
    };
  }
});

export const canvasFormUpdate = new ValidatedMethod({
  name: "people.metaUpdate",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    personId: {
      type: String
    },
    sectionKey: {
      type: String
    },
    data: {
      type: Object,
      blackbox: true
    }
  }).validator(),
  run({ campaignId, personId, sectionKey, data }) {
    logger.debug("people.metaUpdate called", {
      campaignId,
      personId,
      sectionKey,
      data
    });

    let $set = {};

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    const person = People.findOne(personId);

    if (!person) {
      throw new Meteor.Error(401, "Person not found");
    }

    if (person.campaignId !== campaignId) {
      throw new Meteor.Error(401, "Not allowed");
    }

    if (!person.formId) PeopleHelpers.generateFormId({ person });

    if (data.address) {
      let location;
      try {
        location = Promise.await(
          PeopleHelpers.geocode({ address: data.address })
        );
      } catch (e) {
        logger.debug("people.metaUpdate - Not able to fetch location");
      } finally {
        if (location) {
          $set.location = location;
        }
      }
    }

    return People.update(
      {
        campaignId,
        _id: personId
      },
      {
        $set: {
          ...$set,
          [`campaignMeta.${sectionKey}`]: data
        }
      }
    );
  }
});

export const removePeople = new ValidatedMethod({
  name: "people.remove",
  validate: new SimpleSchema({
    personId: {
      type: String
    }
  }).validator(),
  run({ personId }) {
    logger.debug("people.remove called", { personId });

    const userId = Meteor.userId();

    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const person = People.findOne(personId);

    if (!person) {
      throw new Meteor.Error(404, "Person not found");
    }

    const campaign = Campaigns.findOne(person.campaignId);

    if (!campaign) {
      throw new Meteor.Error(404, "Campaign not found");
    }

    if (!_.findWhere(campaign.users, { userId })) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    People.remove(personId);
  }
});

export const exportPeople = new ValidatedMethod({
  name: "people.export",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    }
  }).validator(),
  run({ campaignId }) {
    logger.debug("people.export called", { campaignId });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    const people = People.find(
      { campaignId },
      {
        fields: {
          name: 1,
          facebookId: 1,
          campaignMeta: 1
        }
      }
    ).fetch();

    let flattened = [];

    let header = {};

    for (let person of people) {
      if (person.campaignMeta) {
        for (let key in person.campaignMeta) {
          person[key] = person.campaignMeta[key];
        }
        delete person.campaignMeta;
      }
      const flattenedPerson = flattenObject(person);
      for (let key in flattenedPerson) {
        header[key] = true;
      }
      flattened.push(flattenObject(person));
    }

    return Papa.unparse({
      fields: Object.keys(header),
      data: flattened
    });
  }
});

export const importPeople = new ValidatedMethod({
  name: "people.import",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    config: {
      type: Object,
      blackbox: true
    },
    data: {
      type: Object,
      blackbox: true
    },
    defaultValues: {
      type: Object,
      optional: true
    },
    "defaultValues.tags": {
      type: Array,
      optional: true
    },
    "defaultValues.tags.$": {
      type: String
    },
    "defaultValues.labels": {
      type: Object,
      optional: true,
      blackbox: true
    }
  }).validator(),
  run({ campaignId, config, data, defaultValues }) {
    logger.debug("people.import called", {
      campaignId,
      config,
      data,
      defaultValues
    });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }
    return PeopleHelpers.import({ campaignId, config, data, defaultValues });
  }
});

export const findDuplicates = new ValidatedMethod({
  name: "people.findDuplicates",
  validate: new SimpleSchema({
    personId: {
      type: String
    }
  }).validator(),
  run({ personId }) {
    logger.debug("people.findDuplicates called", { personId });
    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const person = People.findOne(personId);

    const campaign = Campaigns.findOne(person.campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }
    return PeopleHelpers.findDuplicates({ personId });
  }
});

export const mergePeople = new ValidatedMethod({
  name: "people.merge",
  validate: new SimpleSchema({
    personId: {
      type: String
    },
    merged: {
      type: Object,
      blackbox: true
    },
    from: {
      type: Array
    },
    "from.$": {
      type: String
    },
    remove: {
      type: Boolean
    }
  }).validator(),
  run({ personId, merged, from, remove }) {
    logger.debug("people.merge called", { personId, merged, from, remove });

    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }

    const person = People.findOne(personId);

    const campaign = Campaigns.findOne(person.campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }

    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }

    if (merged._id !== person._id) {
      throw new Meteor.Error(401, "Merging object ID does not match");
    }

    const autoFields = [
      "facebookId",
      "counts",
      "facebookAccounts",
      "lastInteractionDate"
    ];

    const people = People.find({
      campaignId: person.campaignId,
      _id: { $in: from }
    }).fetch();

    const uniqFacebookIds = compact(
      uniq([person.facebookId, ...people.map(p => p.facebookId)])
    );

    if (uniqFacebookIds.length > 1) {
      throw new Meteor.Error(
        401,
        "You cannot merge people from different existing Facebook references"
      );
    }

    let $set = {};

    merge(
      $set,
      ...people.map(p => pick(p, autoFields)),
      pick(merged, autoFields)
    );

    let mergeFields = ["name"];
    for (const section of peopleMetaModel) {
      for (const field of section.fields) {
        mergeFields.push(`campaignMeta.${section.key}.${field.key}`);
      }
    }

    for (const field of mergeFields) {
      const value = get(merge, field);
      if (value) {
        $set[field] = value;
      }
    }

    People.update(
      {
        _id: person._id
      },
      {
        $set
      }
    );

    if (remove) {
      People.remove({
        campaignId: person.campaignId,
        _id: { $in: from }
      });
    }

    return;
  }
});

export const peopleFormConnectFacebook = new ValidatedMethod({
  name: "peopleForm.connectFacebook",
  validate: new SimpleSchema({
    token: {
      type: String
    },
    secret: {
      type: String
    },
    campaignId: {
      type: String
    }
  }).validator(),
  run({ token, secret, campaignId }) {
    logger.debug("peopleForm.connectFacebook called", {
      token,
      secret,
      campaignId
    });

    const credential = Facebook.retrieveCredential(token, secret);

    if (credential.serviceData && credential.serviceData.accessToken) {
      const data = Promise.await(
        FB.api("me", {
          fields: ["id", "name", "email"],
          access_token: credential.serviceData.accessToken
        })
      );
      if (data && data.id) {
        People.upsert(
          { campaignId, facebookId: data.id },
          {
            $set: {
              campaignId,
              name: data.name,
              "campaignMeta.contact.email": data.email
            }
          }
        );
        const person = People.findOne({ campaignId, facebookId: data.id });
        let formId = person.formId;
        if (!formId) formId = PeopleHelpers.generateFormId({ person });
        return formId;
      }
    }
    throw new Meteor.Error(500, "Error fetching user data");
  }
});

export const peopleFormSubmit = new ValidatedMethod({
  name: "peopleForm.submit",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    formId: {
      type: String,
      optional: true
    },
    recaptcha: {
      type: String,
      optional: true
    },
    name: {
      type: String
    },
    email: {
      type: String
    },
    cellphone: {
      type: String,
      optional: true
    },
    birthday: {
      type: String,
      optional: true
    },
    address: {
      type: Object,
      optional: true
    },
    "address.country": {
      type: String
    },
    "address.zipcode": {
      type: String,
      optional: true
    },
    "address.region": {
      type: String,
      optional: true
    },
    "address.city": {
      type: String,
      optional: true
    },
    "address.neighbourhood": {
      type: String,
      optional: true
    },
    "address.street": {
      type: String,
      optional: true
    },
    "address.number": {
      type: String,
      optional: true
    },
    "address.complement": {
      type: String,
      optional: true
    },
    skills: {
      type: Array,
      optional: true
    },
    "skills.$": {
      type: String
    },
    supporter: {
      type: Boolean,
      optional: true
    },
    mobilizer: {
      type: Boolean,
      optional: true
    },
    donor: {
      type: Boolean,
      optional: true
    }
  }).validator(),
  run(formData) {
    const { campaignId, formId, recaptcha, ...data } = formData;
    logger.debug("peopleForm.submit called", { campaignId, formId });

    let $set = {
      filledForm: true
    };
    for (const key in data) {
      switch (key) {
        case "email":
        case "cellphone":
          $set[`campaignMeta.contact.${key}`] = data[key];
          break;
        case "address":
        case "birthday":
        case "skills":
          $set[`campaignMeta.basic_info.${key}`] = data[key];
          break;
        case "supporter":
        case "mobilizer":
        case "donor":
          $set[`campaignMeta.${key}`] = data[key];
        default:
          $set[key] = data[key];
      }
    }

    if (!formId && recaptchaSecret) {
      if (recaptcha) {
        const res = Promise.await(
          axios.request({
            url: "https://www.google.com/recaptcha/api/siteverify",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            method: "post",
            params: {
              secret: recaptchaSecret,
              response: recaptcha
            }
          })
        );
        if (!res.data.success) {
          throw new Meteor.Error(400, "Invalid recaptcha");
        }
      } else {
        throw new Meteor.Error(400, "Make sure you are not a robot");
      }
    }

    if (data.address) {
      let location;
      try {
        location = Promise.await(
          PeopleHelpers.geocode({ address: data.address })
        );
      } catch (e) {
        logger.debug("peopleForm.submit - Not able to fetch location");
      } finally {
        if (location) {
          $set.location = location;
        }
      }
    }

    let newFormId;

    if (formId) {
      const person = People.findOne({ formId });
      if (!person) {
        throw new Meteor.Error(400, "Unauthorized request");
      }
      People.update({ formId }, { $set });
      newFormId = PeopleHelpers.getFormId({
        personId: person._id,
        generate: true
      });
    } else {
      const id = Random.id();
      People.upsert(
        {
          campaignId,
          _id: id
        },
        {
          $set: {
            ...$set,
            source: "form"
          }
        }
      );
      newFormId = PeopleHelpers.getFormId({
        personId: id,
        generate: true
      });
    }
    return newFormId;
  }
});

export const peopleGetTags = new ValidatedMethod({
  name: "people.getTags",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    }
  }).validator(),
  run({ campaignId }) {
    logger.debug("peopleTags.get called", { campaignId });
    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }
    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }
    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }
    return PeopleTags.find({ campaignId }).fetch();
  }
});

export const peopleCreateTag = new ValidatedMethod({
  name: "people.createTag",
  validate: new SimpleSchema({
    campaignId: {
      type: String
    },
    name: {
      type: String
    }
  }).validator(),
  run({ campaignId, name }) {
    logger.debug("peopleTags.create called", { campaignId });
    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error(401, "You need to login");
    }
    const campaign = Campaigns.findOne(campaignId);
    if (!campaign) {
      throw new Meteor.Error(401, "This campaign does not exist");
    }
    const allowed = _.findWhere(campaign.users, { userId });
    if (!allowed) {
      throw new Meteor.Error(401, "You are not allowed to do this action");
    }
    return PeopleTags.insert({ campaignId, name });
  }
});
