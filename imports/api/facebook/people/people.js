import SimpleSchema from "simpl-schema";
import { Index, MongoDBEngine } from "meteor/easy:search";
import { Campaigns } from "/imports/api/campaigns/campaigns.js";

const People = new Mongo.Collection("people");
const PeopleIndex = new Index({
  collection: People,
  fields: ["name"],
  defaultSearchOptions: {
    sortBy: "name",
    limit: 10
  },
  engine: new MongoDBEngine({
    selector: function(searchObject, options, aggregation) {
      let selector = this.defaultConfiguration().selector(
        searchObject,
        options,
        aggregation
      );
      for (const key in options.search.props) {
        if (key == "campaignId" || key.indexOf("campaignMeta.") == 0) {
          selector[key] = options.search.props[key];
        }
      }
      return selector;
    },
    sort: function(searchObject, options) {
      const sortBy = options.search.props.sortBy || options.search.sortBy;
      const { facebookId } = options.search.props;
      switch (sortBy) {
        case "name":
          return {
            name: 1
          };
        case "comments":
          if (facebookId) {
            return {
              [`counts.${facebookId}.comments`]: -1
            };
          } else {
            throw new Meteor.Error("Facebook ID is required");
          }
        case "reactions":
          if (facebookId) {
            return {
              [`counts.${facebookId}.likes`]: -1
            };
          } else {
            throw new Meteor.Error("Facebook ID is required");
          }
        default:
          throw new Meteor.Error("Invalid sort by prop passed");
      }
    }
  }),
  permission: options => {
    const campaignId = options.props.campaignId;
    if (options.userId && campaignId) {
      const campaign = Campaigns.findOne(campaignId);
      return _.findWhere(campaign.users, { userId: options.userId });
    }
    return false;
  }
});

People.search = function({ search, options }) {
  logger.debug("people.search called", { search, options });
  const userId = Meteor.userId();
  const campaignId = search.campaignId;

  const campaign = Campaigns.findOne(campaignId);

  if (!userId || !campaignId) {
    throw new Meteor.Error(500, "Invalid request.");
  }
  if (!_.findWhere(campaign.users, { userId })) {
    throw new Meteor.Error(401, "Not allowed");
  }

  let sort = ["_score"];

  if (options.sort) {
    switch (options.sort) {
      case "comments":
        if (options.facebookId) {
          sort.unshift({
            [`counts.${options.facebookId}.comments`]: { order: "desc" }
          });
        }
        break;
      case "reactions":
        if (options.facebookId) {
          sort.unshift({
            [`counts.${options.facebookId}.likes`]: { order: "desc" }
          });
        }
      default:
    }
  }

  let query = {
    bool: {
      must: [
        {
          match: {
            campaignId: campaignId
          }
        }
      ],
      should: []
    }
  };

  for (const prop in search) {
    if (search[prop]) {
      switch (prop) {
        case "campaignId":
          break;
        case "q":
          query.bool.must.push({
            multi_match: {
              query: `*${search[prop]}*`,
              fields: ["name", "campaignMeta.contact.email"]
            }
          });
          break;
        default:
          query.bool.must.push({
            match: { [prop]: search[prop] }
          });
      }
    }
  }

  return elastic.searchAsync({
    index: "people",
    type: "_doc",
    body: {
      sort,
      query
    }
  });
};

People.schema = new SimpleSchema({
  facebookId: {
    type: String,
    index: 1,
    optional: true
  },
  name: {
    type: String
  },
  campaignId: {
    type: String,
    index: 1
  },
  campaignMeta: {
    type: Object,
    blackbox: true,
    optional: true
  },
  facebookAccounts: {
    type: Array,
    optional: true
  },
  "facebookAccounts.$": {
    type: String
  },
  counts: {
    type: Object,
    blackbox: true,
    optional: true
  }
});

People.attachSchema(People.schema);

exports.People = People;
exports.PeopleIndex = PeopleIndex;
