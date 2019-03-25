import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styled, { css } from "styled-components";

import PopupLabel from "./PopupLabel.jsx";

const Container = styled.div`
  font-size: 0.8em;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  a.meta-icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 0.125rem;
    color: #fff;
    border-radius: 100%;
    width: 15px;
    height: 15px;
    padding: 0.4rem;
  }
  ${props =>
    props.vertical &&
    css`
      flex-direction: column;
      a.meta-icon {
        margin: 0 0 1rem;
      }
    `}
  ${props =>
    props.simple &&
    css`
      font-size: 1em;
      a.meta-icon {
        width: auto;
        height: auto;
        padding: 0;
      }
    `}
  ${props =>
    props.readOnly &&
    css`
      a.meta-icon {
        cursor: default;
        &:hover {
          box-shadow: none;
          opacity: 1 !important;
        }
      }
    `}
  ${props =>
    props.interactive &&
    css`
      a.meta-icon {
        transition: all 0.1s ease-in-out;
        transform-origin: 50% 100%;
        background: #fff;
        box-shadow: 0 0 0.5rem rgba(0, 0, 0, 0.1);
        position: relative;
        &:hover {
          z-index: 2;
          opacity: 1 !important;
          transform: scale(1.5);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.1);
        }
      }
    `}
`;

export default class PersonMetaButtons extends React.Component {
  static keys = [
    "supporter",
    "volunteer",
    "mobilizer",
    "donor",
    "influencer",
    "voter",
    "non-voter",
    "troll"
  ];
  static colors = {
    supporter: "#7171fc",
    volunteer: "#ffa500",
    mobilizer: "#d5d500",
    donor: "#46dd46",
    influencer: "#f399cc",
    voter: "#31d5d5",
    "non-voter": "#f25ff2",
    troll: "#ff5656"
  };
  static labels = {
    supporter: "Apoiador",
    volunteer: "Voluntário",
    mobilizer: "Mobilizador",
    donor: "Doador",
    influencer: "Influenciador",
    voter: "Declarou voto",
    "non-voter": "Não pode votar",
    troll: "Troll"
  };
  constructor(props) {
    super(props);
    this._handleClick = this._handleClick.bind(this);
  }
  _handleClick(key) {
    let { person, readOnly, onChange } = this.props;
    if (readOnly) {
      return () => {};
    }
    if (person) {
      person.campaignMeta = person.campaignMeta || {};
      const personId = person.personId || person.__originalId || person._id;
      return ev => {
        const data = {
          personId,
          metaKey: key,
          metaValue: person.campaignMeta[key] ? false : true
        };
        Meteor.call("facebook.people.updatePersonMeta", data, error => {
          if (error) {
            console.log(error);
          } else {
            if (onChange) {
              onChange(data);
            }
            person.campaignMeta[key] = data.metaValue;
            // Alerts.success("Person updated successfully");
          }
        });
      };
    } else {
      return () => {
        onChange(key);
      };
    }
  }
  _hasMeta(data = {}, key) {
    const { active } = this.props;
    return (active && active[key]) || !!data[key];
  }
  _metaIconName(key) {
    switch (key) {
      case "supporter":
        return "star";
      case "volunteer":
        return "hand-point-up";
      case "mobilizer":
        return "users";
      case "donor":
        return "money-bill";
      case "influencer":
        return "certificate";
      case "voter":
        return "thumbs-up";
      case "non-voter":
        return "calendar-times";
      case "troll":
        return "ban";
    }
  }
  _metaIconLabel(key) {
    return PersonMetaButtons.labels[key];
  }
  _metaIconColor(key) {
    return PersonMetaButtons.colors[key];
  }
  _metaIconLabel(key) {
    switch (key) {
      case "supporter":
        return "Up for sharing online content";
      case "volunteer":
        return "Willing to work on one-off tasks";
      case "mobilizer":
        return "Can take bigger responsibilities";
      case "donor":
        return "Donated or potential donors";
      case "influencer":
        return "Has a lot of followers";
      case "voter":
        return "Will vote for you";
      case "non-voter":
        return "Can't vote for you";
      case "troll":
        return "Not waste time responding";
    }
  }
  _metaButton(data = {}, key) {
    const { size, readOnly, simple } = this.props;

    const hasMeta = this._hasMeta(data, key);

    if (readOnly && !hasMeta) return null;

    const iconName = this._metaIconName(key);
    const iconColor = this._metaIconColor(key);
    const iconLabel = this._metaIconLabel(key);

    let style = {};

    if (!readOnly) {
      style["cursor"] = "pointer";
      style["opacity"] = hasMeta ? 1 : 0.5;
    }

    let bottomOffset = "0.25rem";

    if (simple) {
      style["color"] = iconColor;
    } else {
      bottomOffset = "1.25rem";
      style["borderWidth"] = "1px";
      style["borderStyle"] = "solid";
      style["borderColor"] = "#ddd";
      style["color"] = iconColor;
      if (hasMeta) {
        style["color"] = "#333";
        style["backgroundColor"] = iconColor;
        style["borderColor"] = iconColor;
        style["borderColor"] = "rgba(0,0,0,0.5)";
      }
    }

    return (
      <PopupLabel
        text={PersonMetaButtons.labels[key]}
        bottomOffset={bottomOffset}
      >
        <a
          href="javascript:void(0);"
          className="meta-icon"
          style={style}
          onClick={this._handleClick(key)}
        >
          <FontAwesomeIcon icon={iconName} />
        </a>
      </PopupLabel>
    );
  }
  render() {
    const { person, ...props } = this.props;
    return (
      <Container {...props}>
        {this._metaButton(person ? person.campaignMeta : false, "supporter")}
        {this._metaButton(person ? person.campaignMeta : false, "volunteer")}
        {this._metaButton(person ? person.campaignMeta : false, "mobilizer")}
        {this._metaButton(person ? person.campaignMeta : false, "donor")}
        {this._metaButton(person ? person.campaignMeta : false, "influencer")}
        {this._metaButton(person ? person.campaignMeta : false, "voter")}
        {this._metaButton(person ? person.campaignMeta : false, "non-voter")}
        {this._metaButton(person ? person.campaignMeta : false, "troll")}
      </Container>
    );
  }
}
