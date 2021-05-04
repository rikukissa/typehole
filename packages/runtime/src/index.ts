import fetch from "isomorphic-fetch";

let queue: Promise<any> = Promise.resolve();

function typeholeFactory(id: string | symbol | number) {
  return function typehole<T = any>(input: T): T {
    try {
      queue = queue.then(() =>
        fetch("http://localhost:17341/samples", {
          method: "POST",
          mode: "cors",
          body: JSON.stringify({
            id,
            sample: input,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        }).catch((err) => console.log(err.message))
      );
    } catch (error) {
      console.error(error);
    }

    return input;
  };
}

export default new Proxy<Record<string, ReturnType<typeof typeholeFactory>>>(
  {} as any,
  {
    get: function (target, prop, receiver) {
      if (/^t([0-9]+)?$/.test(prop.toString())) {
        return typeholeFactory(prop);
      }

      return Reflect.get(target, prop, receiver);
    },
  }
);
