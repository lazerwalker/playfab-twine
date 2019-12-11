import { PlayFabClientSDK, PlayFab } from "playfab-sdk";

interface HarloweState {
  variables: { [key: string]: any };
  on: (event: string, callback: (e: any) => void) => void;
  passage: string;
}

interface Window {
  setupPlayfab: (trackedVars: string[]) => void;
}

const State: HarloweState = (window as any).State;

const trackedValues = (trackedVariables: string[]) => {
  let map = {};
  trackedVariables.forEach(function(v) {
    map[v] = State.variables[v];
  });
  return map;
};

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

window.setupPlayfab = (trackedVariables: string[]) => {
  var guid = getGUID();
  PlayFab.settings.titleId = "2F970";

  PlayFabClientSDK.LoginWithCustomID(
    {
      TitleId: PlayFab.settings.titleId,
      CustomId: guid,
      CreateAccount: true
    },
    (response, error) => {
      if (error) {
        console.log("Login error", error);
      } else {
        console.log(response.data);
        setUpStateHandlers(trackedVariables);
      }
    }
  );
};

const setUpStateHandlers = (trackedVariables: string[]) => {
  State.on("forward", e => {
    PlayFabClientSDK.WritePlayerEvent({
      EventName: "node_loaded",
      Body: { text: e, state: trackedValues(trackedVariables) },
      Timestamp: new Date()
    });
    console.log("History event!", e);
  });

  // Because we're using this in context of Twine 2 + Harlowe,
  // we can assume jQuery will already exist in the execution environment
  $(document).on("click", "tw-link", e => {
    console.log("Tracking link click event: '" + e.target.innerText + "'");
    PlayFabClientSDK.WritePlayerEvent({
      EventName: "link_clicked",
      Body: {
        text: e.target.innerText,
        state: trackedValues(trackedVariables)
      },
      Timestamp: new Date()
    });

    PlayFabClientSDK.WritePlayerEvent({
      EventName: "link_clicked_" + e.target.innerText.replace(/\W/gi, "_"),
      Body: {
        text: e.target.innerText,
        state: trackedValues(trackedVariables)
      },
      Timestamp: new Date()
    });
  });

  window.addEventListener("beforeunload", function(e) {
    console.log("Tracking browser close with node " + State.passage);
    PlayFabClientSDK.WritePlayerEvent({
      EventName: "game_closed",
      Body: { text: State.passage, state: trackedValues(trackedVariables) },
      Timestamp: new Date()
    });
  });
};
