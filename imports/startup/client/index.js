if (!Meteor.settings.public.server || Meteor.settings.public.server == "main") {
  // import "./routes/index.js";
  // import "./globals.js";

  import createStore from "../../ui2/store";
  createStore();

  import "./icons";
  import "./routes2";
  // import "/imports/ui2";
}
