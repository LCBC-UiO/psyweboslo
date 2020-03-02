const https = require('https');
const request = require('request');

/*------------------------------------------------------------------------------*/

exports.upload = async function (nettskjemaId, data) {
  const fieldNames = await getSchemaFieldsPub(nettskjemaId);
  await uploadSchemaPub(nettskjemaId, fieldNames, data);
};

/*------------------------------------------------------------------------------*/

const kNettskjemaResponseSuccess = 'success';

/*------------------------------------------------------------------------------*/

const JsonFieldNames = Object.freeze({
  "form": "form",
  "pages": "pages",
  "elements": "elements",
  "questions": "questions",
  "externalQuestionId": "externalQuestionId",
  "questionId": "questionId",
  "message": "message",
  "status": "status"
});

/*------------------------------------------------------------------------------*/

// wrapper for async https.get
function asyncGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      let data = '';

      resp.on('data', (chunk) => {
        data += chunk;
      });  

      resp.on('end', () => {
        resolve(data);
      });
    }).on("error", (err) => {
      reject(`HTTP get error '${err.message}'`);
    });
  });
}

/*------------------------------------------------------------------------------*/

// wrapper for async request multi-part
function asyncPostMultiPart(url, form) {
  return new Promise((resolve, reject) => {
    request.post({
      url: url,
      method: 'POST',
      form: form
    }, function (err, resp, body) {
      if (err) {
        reject(err)
      } else {
        resolve(body);
      }
    });
  });
}

/*------------------------------------------------------------------------------*/

async function getSchemaFieldsPub(nettskjemaId) {
  const data = await asyncGet(`https://nettskjema.no/answer/answer.json?formId=${nettskjemaId}`);
  const json = JSON.parse(data); // TODO: catch parse error
  const jsonStatus = getJsonFieldSafe(json, JsonFieldNames.status);
  if (jsonStatus != kNettskjemaResponseSuccess) {
    const message = json[JsonFieldNames.message];
    throw message;
  }
  // dict: colname(string),id(int)
  var m = new Map();
  const form = getJsonFieldSafe(json, JsonFieldNames.form);
  const pages = getJsonFieldSafe(form, JsonFieldNames.pages);
  for (var i = 0; i < pages.length; i++) {
    const page = pages[i];
    const elements = getJsonFieldSafe(page, JsonFieldNames.elements);
    for (var j = 0; j < elements.length; j++) {
      const element = elements[j];
      const questions = getJsonFieldSafe(element, JsonFieldNames.questions);
      for (var k = 0; k < questions.length; k++) {
        const question = questions[k];
        let externalQuestionId = getJsonFieldSafe(question, JsonFieldNames.externalQuestionId);
        var questionId = getJsonFieldSafe(question, JsonFieldNames.questionId);
        m[externalQuestionId] = questionId;
      }
    }
  }
  return m;
}

/*------------------------------------------------------------------------------*/

async function uploadSchemaPub(/*int*/ nettskjemaId, /*Map<String, int>*/ fieldNames, /*Map<String, String>*/ data) {
  matchesExpectedSchemaFieldsPub(Array.from(fieldNames.keys()), Array.from( data.keys())); //throws exeption if false
  var url = `https://nettskjema.no/answer/deliver.json?formId=${nettskjemaId}&quizResultAsJson=true&elapsedTime=42`;
  let form = new Map();
  for (const [k, v] of Object.entries(data)) {
    const questionId = fieldNames[k];
    form[`answersAsMap[${questionId}].textAnswer`] = v;
  }
  const resp = await asyncPostMultiPart(url, form);
  const json = JSON.parse(resp); // TODO: catch parse error
  const jsonStatus = getJsonFieldSafe(json, JsonFieldNames.status);
  if (jsonStatus != kNettskjemaResponseSuccess) {
    const message = json[JsonFieldNames.message];
    throw message;
  }
}

/*------------------------------------------------------------------------------*/

/// check if fields in a nettskjema match expected fields  - 1:1 and no additional fields
function matchesExpectedSchemaFieldsPub(nettskjemaFields, expectedFields) {
  let diff1 = nettskjemaFields.filter(function(x) { return expectedFields.indexOf(x) < 0 });
  if (diff1.length > 0) {
    throw `mismatching form fields: ${diff1.join(",")} (nettskjema field)`;
  }
  let diff2 = expectedFields.filter(function(x) { return nettskjemaFields.indexOf(x) < 0 });
  if (diff2.length > 0) {
    throw `mismatching form fields: ${diff2.join(",")} (expected field)`;
  }
  return true;
}

/*------------------------------------------------------------------------------*/

function getJsonFieldSafe(json, fieldName) {
  if (fieldName == null) {
    throw "internal error - fieldname is null";
  }
  const r = json[fieldName];
  if (r == null) {
    throw `received JSON does not contain field '${fieldName}'\n${json.toString()}`;
  }
  return r;
}
