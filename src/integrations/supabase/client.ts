// DEMO MODE: Supabase client is stubbed. All queries return empty data
// and no network requests are made. Realtime channels are no-ops.

type Result = { data: any; error: null };
const emptyArr: Result = { data: [], error: null };
const emptyOne: Result = { data: null, error: null };

function makeBuilder(single = false): any {
  const builder: any = {
    select: () => makeBuilder(single),
    insert: () => Promise.resolve(emptyOne),
    update: () => makeBuilder(single),
    upsert: () => Promise.resolve(emptyOne),
    delete: () => makeBuilder(single),
    eq: () => makeBuilder(single),
    neq: () => makeBuilder(single),
    in: () => makeBuilder(single),
    gte: () => makeBuilder(single),
    lte: () => makeBuilder(single),
    gt: () => makeBuilder(single),
    lt: () => makeBuilder(single),
    like: () => makeBuilder(single),
    ilike: () => makeBuilder(single),
    is: () => makeBuilder(single),
    order: () => makeBuilder(single),
    limit: () => makeBuilder(single),
    range: () => makeBuilder(single),
    single: () => Promise.resolve(emptyOne),
    maybeSingle: () => Promise.resolve(emptyOne),
    then: (resolve: any) => Promise.resolve(single ? emptyOne : emptyArr).then(resolve),
  };
  return builder;
}

const channelStub = {
  on: () => channelStub,
  subscribe: () => channelStub,
  unsubscribe: () => Promise.resolve("ok"),
};

export const supabase: any = {
  from: () => makeBuilder(),
  channel: () => channelStub,
  removeChannel: () => Promise.resolve("ok"),
  removeAllChannels: () => Promise.resolve("ok"),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Demo mode" } }),
    signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Demo mode" } }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    updateUser: () => Promise.resolve({ data: { user: null }, error: null }),
    resetPasswordForEmail: () => Promise.resolve({ data: {}, error: null }),
  },
  functions: {
    invoke: () => Promise.resolve({ data: null, error: null }),
  },
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      download: () => Promise.resolve({ data: null, error: null }),
      remove: () => Promise.resolve({ data: null, error: null }),
      list: () => Promise.resolve({ data: [], error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
};
