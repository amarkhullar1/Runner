function createAsyncQuery(executor) {
  const state = {};

  const exec = () => Promise.resolve().then(() => executor(state));

  const query = {
    select(selection) {
      state.selection = selection;
      return query;
    },
    sort(sortSpec) {
      state.sort = sortSpec;
      return query;
    },
    limit(limitValue) {
      state.limit = limitValue;
      return query;
    },
    then(resolve, reject) {
      return exec().then(resolve, reject);
    },
    catch(reject) {
      return exec().catch(reject);
    },
    exec,
  };

  return query;
}

module.exports = {
  createAsyncQuery,
};
