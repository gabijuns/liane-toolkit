export const AUTH_REQUEST = "AUTH_REQUEST";
export const AUTH_FAILURE = "AUTH_FAILURE";
export const AUTH_SUCCESS = "AUTH_SUCCESS";

export const AUTH_LOGOUT_REQUEST = "AUTH_LOGOUT_REQUEST";
export const AUTH_LOGOUT_SUCCESS = "AUTH_LOGOUT_SUCCESS";

const _request = credentials => {
  return {
    type: AUTH_REQUEST,
    credentials
  };
};

const _failure = (credentials, err) => {
  return {
    type: AUTH_FAILURE,
    credentials,
    err
  };
};

const _success = (credentials, user) => {
  return {
    type: AUTH_SUCCESS,
    credentials,
    user
  };
};

const _logoutRequest = () => {
  return {
    type: AUTH_LOGOUT_REQUEST
  };
};

const _logoutSuccess = () => {
  return {
    type: AUTH_LOGOUT_SUCCESS
  };
};

export const passwordAuthentication = credentials => dispatch => {
  dispatch(_request(credentials));
  Meteor.loginWithPassword(credentials.email, credentials.password, err => {
    if (err) {
      dispatch(_failure(credentials, err));
    } else {
      dispatch(_success(credentials, Meteor.user()));
    }
  });
};

export const facebookAuthentication = () => dispatch => {
  const credentials = { type: "facebook" };
  Meteor.loginWithFacebook(
    {
      requestPermissions: [
        "public_profile",
        "email",
        "manage_pages",
        "pages_show_list",
        "ads_management",
        "ads_read",
        "business_management",
        "read_page_mailboxes"
      ]
    },
    err => {
      if (err) {
        dispatch(_failure(credentials, err));
      } else {
        Meteor.call("users.exchangeFBToken", (err, data) => {
          if (err) {
            dispatch(_failure(credentials, err));
          } else {
            dispatch(_success(credentials, Meteor.user()));
          }
        });
      }
    }
  );
};

export const logout = () => dispatch => {
  dispatch(_logoutRequest());
  Meteor.logout(err => {
    dispatch(_logoutSuccess());
  });
};
