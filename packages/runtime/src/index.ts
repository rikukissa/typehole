import fetch from "isomorphic-fetch";

function serialize(value: any) {
  let serialized: string | null = null;
  try {
    serialized = JSON.stringify(value);
  } catch (error) {}
  return serialized;
}

function isPlainObject(value: any) {
  return typeof value === "object" && value.toString() === "[object Object]";
}

type HoleId = string | symbol | number;

let config = {
  extensionHost: "http://localhost:17341",
};

export function configure(newConfig: Partial<typeof config>) {
  config = { ...config, ...newConfig };
}

function sendUnserializable(holeId: HoleId) {
  return fetch(`${config.extensionHost}/unserializable`, {
    method: "POST",
    mode: "cors",
    body: JSON.stringify({
      id: holeId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  }).catch((err) => console.log(err.message));
}

// This is here so that multiple types would not be edited simultaniously
let sampleQueue: Promise<any> = Promise.resolve();
function sendSample(holeId: HoleId, input: any) {
  sampleQueue = sampleQueue.then(() =>
    fetch(`${config.extensionHost}/samples`, {
      method: "POST",
      mode: "cors",
      body: JSON.stringify({
        id: holeId,
        sample: input,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }).catch((err) => console.log(err.message))
  );
  return sampleQueue;
}

async function solveWrapperTypes(value: any) {
  if (typeof value?.then === "function") {
    return {
      __typehole_wrapper_type__: "Promise",
      __typehole_value__: await value,
    };
  }
  return value;
}

function typeholeFactory(id: HoleId) {
  const emitSample = sendSample;
  let previousValue: string | null = null;

  return function typehole<T = any>(input: T): T {
    solveWrapperTypes(input).then((withWrapperTypes) => {
      const serialized = serialize(withWrapperTypes);

      if (serialized === previousValue) {
        return input;
      }

      previousValue = serialized;

      if (
        !serialized ||
        (serialized === "{}" && !isPlainObject(withWrapperTypes))
      ) {
        console.info("Typehole:", "Cannot serialize value", {
          input,
          serialized,
        });
        sendUnserializable(id);
      } else {
        emitSample(id, withWrapperTypes);
      }
    });

    return input;
  };
}

const holes: Record<string, ReturnType<typeof typeholeFactory>> = {};

export default new Proxy<Record<string, ReturnType<typeof typeholeFactory>>>(
  {} as any,
  {
    get: function (target, prop, receiver) {
      if (/^t([0-9]+)?$/.test(prop.toString())) {
        if (!holes[prop as string]) {
          holes[prop as string] = typeholeFactory(prop);
        }

        return holes[prop as string];
      }

      return Reflect.get(target, prop, receiver);
    },
  }
);
