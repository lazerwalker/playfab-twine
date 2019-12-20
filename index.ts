import { PlayFabClient, PlayFab } from "playfab-sdk";

interface HarloweState {
  variables: { [key: string]: any };
  on: (event: string, callback: (e: any) => void) => void;
  passage: string;
}

interface Window {
  setupPlayfab: (
    playfabID: string,
    trackedVars: string[],
    State: HarloweState
  ) => void;
}

const createGUID = (): string => {
  //http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  // via http://s3-us-west-2.amazonaws.com/api-playfab-com-craft-files/FileAssets/index.html
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const getGUID = () => {
  if (window.localStorage && window.localStorage.GUID) {
    return window.localStorage.GUID;
  } else {
    var guid = createGUID();
    if (window.localStorage) {
      window.localStorage.GUID = guid;
    }
    return guid;
  }
};

window.setupPlayfab = (
  playfabID: string,
  trackedVariables: string[],
  State: HarloweState
) => {
  const trackedValues = (trackedVariables: string[]) => {
    let map = {};
    trackedVariables.forEach(function(v) {
      map[v] = State.variables[v];
    });
    return map;
  };

  var guid = getGUID();
  PlayFab.settings.titleId = playfabID;

  PlayFabClient.LoginWithCustomID(
    {
      TitleId: PlayFab.settings.titleId,
      CustomId: guid,
      CreateAccount: true
    },
    (error, response) => {
      if (error) {
        console.log("Login error", error);
      } else {
        console.log(response.data);
        setUpStateHandlers(trackedVariables);
      }
    }
  );

  const setUpStateHandlers = (trackedVariables: string[]) => {
    State.on("forward", e => {
      PlayFabClient.WritePlayerEvent({
        EventName: "node_loaded",
        Body: { Node: e, State: trackedValues(trackedVariables) },
        Timestamp: new Date()
      });

      PlayFabClient.WritePlayerEvent({
        EventName: "node_loaded_" + e.replace(/\W/gi, "_"),
        Body: { Node: e, State: trackedValues(trackedVariables) },
        Timestamp: new Date()
      });
      console.log("History event!", e);
    });

    // Because we're using this in context of Twine 2 + Harlowe,
    // we can assume jQuery will already exist in the execution environment
    $(document).on("click", "tw-link", e => {
      console.log("Tracking link click event: '" + e.target.innerText + "'");
      PlayFabClient.WritePlayerEvent({
        EventName: "link_clicked",
        Body: {
          Text: e.target.innerText,
          State: trackedValues(trackedVariables)
        },
        Timestamp: new Date()
      });

      PlayFabClient.WritePlayerEvent({
        EventName: "link_clicked_" + e.target.innerText.replace(/\W/gi, "_"),
        Body: {
          Text: e.target.innerText,
          State: trackedValues(trackedVariables)
        },
        Timestamp: new Date()
      });
    });

    window.addEventListener("beforeunload", function(e) {
      console.log("Tracking browser close with node " + State.passage);
      PlayFabClient.WritePlayerEvent({
        EventName: "game_closed",
        Body: { Node: State.passage, State: trackedValues(trackedVariables) },
        Timestamp: new Date()
      });
    });
  };
};
