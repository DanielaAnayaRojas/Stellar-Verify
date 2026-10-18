// Informe de salud: detecta el desajuste de registros de DIDs (H2) y la configuración de la institución.
// Todo son datos públicos; no incluye claves ni valores del entorno.

async function settle(task) {
  try {
    return await task();
  } catch {
    return null;
  }
}

export async function buildHealthReport({ provider, config }) {
  const [network, resolver, did, vault] = await Promise.all([
    settle(() => provider.getNetworkInfo()),
    settle(() => provider.getResolverInfo()),
    settle(() => provider.resolveDid(config.institutionDid)),
    settle(() => provider.getVaultInfo()),
  ]);

  const registryApi = network ? network.registryId : null;
  const registryResolver = resolver ? resolver.registryId : null;
  // null = no comparable (alguno de los dos no respondió o no trae el registro).
  const registryMatch = registryApi && registryResolver ? registryApi === registryResolver : null;

  const institutionDidResolves = Boolean(did) && !did.deactivated;
  const institutionKeyListed = Boolean(did) && did.authenticationKeys.includes(config.institutionPublicKey);
  const vaultDidOk = Boolean(vault) && vault.didUri === config.institutionDid;
  const networkType = network ? network.networkType : null;

  // "ok" significa listo para usarse completo: la verificación pública y también el panel (sesión).
  return {
    ok:
      networkType === "testnet" &&
      registryMatch !== false &&
      institutionDidResolves &&
      institutionKeyListed &&
      vaultDidOk &&
      config.session === "ok",
    configured: true,
    networkType,
    registryApi,
    registryResolver,
    registryMatch,
    institutionDidResolves,
    institutionKeyListed,
    vaultDidOk,
    // "ok" | "missing" | "too_short": el secreto de sesión del panel (nunca su valor).
    session: config.session,
    // "on" | "off": si la verificación exige la firma de la institución (opción A).
    signatureLayer: config.signatureLayer,
  };
}
