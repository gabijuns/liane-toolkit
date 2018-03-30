import elasticClient from "/imports/startup/server/elastic.js";

export default function({ search }) {
  const userId = Meteor.userId();
  const campaignId = search.campaignId;

  if (!userId || !campaignId) {
    throw new Meteor.Error(500, "Invalid request.");
  }
  if (!_.findWhere(campaign.users, { userId: options.userId })) {
    throw new Meteor.Error(401, "Not allowed");
  }

  let query = {
    bool: {
      must: {
        match: {
          campaignId: campaignId
        }
      },
      should: []
    }
  };

  for (const prop in search) {
    query.boold.should.push({
      match: { [prop]: search[prop] }
    });
  }

  return elasticClient.searchAsync({
    index: "meteor",
    type: "people",
    body: { query }
  });
}
