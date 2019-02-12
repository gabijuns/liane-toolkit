import {
  AUTH_SUCCESS,
  AUTH_FAILURE,
  AUTH_LOGOUT_SUCCESS
} from "../actions/auth";

const initialState = {};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case AUTH_SUCCESS: {
      return {
        ...state,
        signedIn: true,
        user: {
          ...action.user
        }
      };
    }
    case AUTH_FAILURE: {
      return {
        ...state,
        signedIn: false,
        user: undefined
      };
    }
    case AUTH_LOGOUT_SUCCESS: {
      return {
        ...state,
        signedIn: false,
        user: undefined
      };
    }
    default:
      return state;
  }
}
