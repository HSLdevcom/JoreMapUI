const commonConstants = {
    DECIMALS_IN_GEOMETRIES: 6,
    MAP_LAYERS_MIN_ZOOM_LEVEL: 15,
    NEW_OBJECT_TAG: 'new',
    ADDRESS_SEARCH_RESULT_COUNT: 10,
};

const developmentConstants = {
    ...commonConstants,
    AFTER_LOGIN_URL: 'http://localhost:3000/afterLogin',
    FADE_DIALOG_TIMEOUT: 500, // milliseconds
    IS_LOGIN_REQUIRED: false,
};

const productionConstants = {
    ...commonConstants,
    AFTER_LOGIN_URL: 'http://jore-map-dev.hsldev.com/afterLogin',
    FADE_DIALOG_TIMEOUT: 2500, // milliseconds
    IS_LOGIN_REQUIRED: true, // set always true in production
};

const isDevelopment = (process.env.NODE_ENV === 'development');

export default isDevelopment ? developmentConstants : productionConstants;
