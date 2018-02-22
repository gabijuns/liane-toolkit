import React from "react";
import Loading from "/imports/ui/components/utils/Loading.jsx";
import { Card, Header, Label } from "semantic-ui-react";
import AudienceUtils from "./Utils.js";

export default class AudienceCategoriesList extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    const { loading, summary, campaignId, facebookAccountId } = this.props;
    if (loading) {
      return <Loading />;
    } else if (summary.length) {
      return (
        <Card.Group>
          {summary.map(item => (
            <Card key={item.category._id}>
              <Card.Content>
                <Card.Header>
                  <a
                    href={FlowRouter.path("App.campaignAudience.category", {
                      campaignId,
                      facebookId: facebookAccountId,
                      categoryId: item.category._id
                    })}
                  >
                    {item.category.title}
                  </a>
                </Card.Header>
              </Card.Content>
              {item.audience ? (
                <Card.Content textAlign="center">
                  <Header size="large">
                    <strong>{AudienceUtils.getPercentage(item.audience)}</strong>{" "}
                    <Label size="small">
                      {AudienceUtils.getRatio(item.audience)}
                    </Label>
                  </Header>
                </Card.Content>
              ) : null}
              {item.geolocations.map(item => (
                <Card.Content key={item.geolocation._id} extra>
                  {item.geolocation.name}:{" "}
                  {item.audience ? (
                    <span>
                      <strong>
                        {AudienceUtils.getPercentage(item.audience)}{" "}
                      </strong>
                      <Label size="small">
                        {AudienceUtils.getRatio(item.audience)}
                      </Label>
                    </span>
                  ) : (
                    "Data not found"
                  )}
                </Card.Content>
              ))}
            </Card>
          ))}
        </Card.Group>
      );
    } else {
      return null;
    }
  }
}
