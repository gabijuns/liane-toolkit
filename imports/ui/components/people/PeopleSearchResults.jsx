import React from "react";
import Loading from "/imports/ui/components/utils/Loading.jsx";
import styled from "styled-components";
import { Table, Icon, Grid } from "semantic-ui-react";
import PeopleMetaButtons from "/imports/ui/components/people/PeopleMetaButtons.jsx";
import Reaction from "/imports/ui/components/entries/Reaction.jsx";

const Interactivity = styled.div`
  opacity: 0.75;
  .grid {
    text-align: center;
    color: #999;
    img,
    .icon {
      display: inline-block;
      float: left;
      margin-right: 0.5rem;
      color: #333;
    }
  }
`;

const reactions = ["like", "love", "wow", "haha", "sad", "angry"];

export default class PeopleSearchResults extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      people: null
    };
  }
  componentDidMount() {
    const { people } = this.props;
    this.setState({ people });
  }
  componentWillReceiveProps(nextProps) {
    this.setState({ people: nextProps.people });
  }
  _handleMetaChange = data => {
    let people = { ...this.state.people };
    people.hits.forEach((person, i) => {
      if (person._id == data.personId) {
        people.hits[i] = {
          ...person,
          _source: {
            ...person._source,
            campaignMeta: {
              ...person._source.campaignMeta,
              [data.metaKey]: data.metaValue
            }
          }
        };
      }
    });
    this.setState({ people });
  };
  render() {
    const { loading, facebookId, campaignId } = this.props;
    const { people } = this.state;
    if (loading) {
      return <Loading />;
    } else if (people.hits.length) {
      return (
        <div>
          <p>{people.total} people found.</p>
          <Table>
            <Table.Body>
              {people.hits.map(person => (
                <Table.Row key={`commenter-${person._id}`}>
                  <Table.Cell collapsing>
                    <a
                      target="_blank"
                      href={`https://facebook.com/${person._source.facebookId}`}
                    >
                      <Icon name="facebook official" />
                    </a>
                  </Table.Cell>
                  <Table.Cell singleLine collapsing>
                    <PeopleMetaButtons
                      person={{ _id: person._id, ...person._source }}
                      onChange={this._handleMetaChange}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <a
                      href={FlowRouter.path("App.campaignPeople.detail", {
                        campaignId,
                        personId: person._id
                      })}
                    >
                      {person._source.name}
                    </a>
                  </Table.Cell>
                  <Table.Cell>
                    <Interactivity>
                      <Grid
                        className="interactivity"
                        widths="equal"
                        columns={7}
                        verticalAlign="middle"
                      >
                        <Grid.Row>
                          <Grid.Column>
                            <Icon name="comment" />
                            {person._source.counts[facebookId] ? (
                              <span>
                                {person._source.counts[facebookId].comments ||
                                  0}
                              </span>
                            ) : (
                              <span>0</span>
                            )}
                          </Grid.Column>
                          {reactions.map(reaction => (
                            <Grid.Column key={reaction}>
                              <Reaction size="tiny" reaction={reaction} />
                              {person._source.counts[facebookId] &&
                              person._source.counts[facebookId].reactions ? (
                                <span>
                                  {
                                    person._source.counts[facebookId].reactions[
                                      reaction
                                    ]
                                  }
                                </span>
                              ) : (
                                <span>0</span>
                              )}
                            </Grid.Column>
                          ))}
                        </Grid.Row>
                      </Grid>
                    </Interactivity>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      );
    } else {
      return <p>No people were found.</p>;
    }
  }
}
