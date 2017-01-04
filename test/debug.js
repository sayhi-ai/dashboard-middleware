const middleware = require("../dev/lib.min")

const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE0ODYwNjI4NzYsImlhdCI6MTQ4MzQ3MDg3NiwicHJvamVjdElkIjoiY2l0Y3lveDN6MHBiaDAxNzF1Nmk2YjhudSIsInVzZXJJZCI6ImNpeDlocDloZjc3YWcwMTI4aGV4cm5mNXoiLCJhdXRoRGF0YSI6eyJlbWFpbCI6Imp1bGlhbmJyZW5kbEBnbWFpbC5jb20ifX0.zI8QweyVke3IXMbJDHN1a-qsZ3aUhyPkfXE5Ji_sCC0"

const fetchResponses = function(phraseId) {
  return middleware.default.getResponseHandler().getResponses(token, phraseId, 'text')
    .then(json => console.log(json.responses))
    .catch(error => {
      console.log("Unable to fetch responses.")
    })
}

const addResponse = function(phraseId, text, html, vars) {
  return middleware.default.getResponseHandler().addResponse(token, phraseId, text, html, vars)
    .then(json => {
      if (json.added) {
        console.log({id: json.id, text: text})
      } else {
        console.log("Response already exists.")
      }
    })
    .catch(error => {
      console.log("Unable to add response.")
    })
}

const removeResponse = function(phraseId, responseId) {
  return middleware.default.getResponseHandler().removeResponse(token, phraseId, responseId)
    .then(json => {
      if (json.removed) {
        console.log(responseId)
      } else {
        console.log("Error removing response.")
      }
    })
    .catch(error => {
      console.log("Unable to remove response.")
    })
}

const phraseId = "cixi6jot5qkla0141zcxwxut3"
const text = `sdffsdf " \\sfd `
const html = "<p>" + text + "</p>"
const vars = []
addResponse(phraseId, text, html, vars)
