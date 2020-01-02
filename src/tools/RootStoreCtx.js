import React from "react";

/**
 * @type {React.Context<RootStore|undefined>}
 */
const RootStoreCtx = React.createContext(undefined);
RootStoreCtx.displayName = 'RootStoreCtx';

export default RootStoreCtx;