let ENV_VARS

const CONSTANTS = {
  GRAPHCOOL_URL: "https://api.graph.cool/simple/v1/citcyox3z0pbh0171u6i6b8nu",
  MAX_PHRASE_TOKEN_LENGTH: 50,
  MAX_RESPONSE_LENGTH: 300,
  RESPONSE_VARIABLE: "$VAR"
}

const GC_ERRORS = {
  USER_EXISTS: 3023
}

if (process.env.NODE_ENV === "production") {
  ENV_VARS = {
    ROOT: "build",
    CONSTANTS: CONSTANTS,
    GC_ERRORS: GC_ERRORS
  }
} else {
  ENV_VARS = {
    ROOT: "dev",
    CONSTANTS: CONSTANTS,
    GC_ERRORS: GC_ERRORS
  }
}

export default ENV_VARS
