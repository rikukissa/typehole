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

function sendUnserializable(holeId: HoleId) {
  return fetch("http://localhost:17341/unserializable", {
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
    fetch("http://localhost:17341/samples", {
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

const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise((resolve) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
};

function typeholeFactory(id: HoleId) {
  const emitSample = debounce(sendSample, 300);
  let previousValue: string | null = null;

  return function typehole<T = any>(input: T): T {
    const serialized = serialize(input);

    if (serialized === previousValue) {
      return input;
    }

    previousValue = serialized;

    if (!serialized || (serialized === "{}" && !isPlainObject(input))) {
      sendUnserializable(id);
    } else {
      emitSample(id, input);
    }

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
