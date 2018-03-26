import SimpleSchema from "simpl-schema";
import { Index, MongoDBEngine } from "meteor/easy:search";
import { ElasticSearchEngine } from "meteor/easysearch:elasticsearch";
import { Campaigns } from "/imports/api/campaigns/campaigns.js";
import _ from "underscore";

const config = Meteor.settings.elastic;

const People = new Mongo.Collection("people");
const PeopleIndex = new Index({
  collection: People,
  fields: ["name"],
  defaultSearchOptions: {
    sortBy: "name",
    limit: 10
  },
  mapping: {
    people: {
      properties: {
        name: {
          type: "string"
        }
      }
    }
  },
  engine: new ElasticSearchEngine({
    client: config,
    query(searchObject, options) {
      let query = { bool: { should: [] } };
      _.each(searchObject, (searchString, field) => {
        if (searchString) {
          query.bool.should.push({
            match: {
              [field]: searchString
            }
          });
        }
      });
      if (!query.bool.should.length) {
        return { match_all: {} };
      }
      return query;
    },
    sort(searchObject, options) {
      return ["_score", ...options.index.fields];
    },
    body: body => {
      body._source = ["_id"];
      delete body.fields;
      return body;
    },
    getElasticSearchDoc: (doc, fields) => {
      return doc;
    }
  }),
  // engine: new MongoDBEngine({
  //   selector: function(searchObject, options, aggregation) {
  //     let selector = this.defaultConfiguration().selector(
  //       searchObject,
  //       options,
  //       aggregation
  //     );
  //     for (const key in options.search.props) {
  //       if (key == "campaignId" || key.indexOf("campaignMeta.") == 0) {
  //         selector[key] = options.search.props[key];
  //       }
  //     }
  //     return selector;
  //   },
  //   sort: function(searchObject, options) {
  //     const sortBy = options.search.props.sortBy || options.search.sortBy;
  //     const { facebookId } = options.search.props;
  //     switch (sortBy) {
  //       case "name":
  //         return {
  //           name: 1
  //         };
  //       case "comments":
  //         if (facebookId) {
  //           return {
  //             [`counts.${facebookId}.comments`]: -1
  //           };
  //         } else {
  //           throw new Meteor.Error("Facebook ID is required");
  //         }
  //       case "reactions":
  //         if (facebookId) {
  //           return {
  //             [`counts.${facebookId}.likes`]: -1
  //           };
  //         } else {
  //           throw new Meteor.Error("Facebook ID is required");
  //         }
  //       default:
  //         throw new Meteor.Error("Invalid sort by prop passed");
  //     }
  //   }
  // }),
  permission: options => {
    const campaignId = options.props.campaignId;
    if (options.userId && campaignId) {
      const campaign = Campaigns.findOne(campaignId);
      return _.findWhere(campaign.users, { userId: options.userId });
    }
    return false;
  }
});

People.schema = new SimpleSchema({
  facebookId: {
    type: String,
    index: 1
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
