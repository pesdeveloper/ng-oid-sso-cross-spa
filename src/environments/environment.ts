export const environment = {
  production: false,
  authConfig: {
    //authority: 'https://localhost:7301',
    authority: 'https://sb-idp.malvinasargentinas.gob.ar',
  },
  externalSites: {
    urlConDeepLink: 'https://localhost:4203/datos/comercio/708?v=RC-12-12345678',
    urlConDeepLinkInvalido: 'https://localhost:4203/datos_error/comercio/708?v=RC-12-12345678',
    urlSinDeepLink: 'https://localhost:4203/',
    urlSbMasPagosConDeepLink: 'https://sb-pagosonline.malvinasargentinas.gob.ar/checkout-external/habilitaciones/2/23456?rc=RC-4-2345&url_retorno=https%3A%2F%2Ftest-spa-opendata.malvinasargentinas.gob.ar%2F',
  }
};
