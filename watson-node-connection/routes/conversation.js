'use strict';

var express = require('express');
var router = express.Router();
var pt = require('promise-timeout');

//Instance watson conversation
var ConversationV1 = require('watson-developer-cloud/conversation/v1');
var conversation = new ConversationV1({
  username : process.env.CONVERSATION_USERNAME,
  password : process.env.CONVERSATION_PASSWORD,
  path : { workspace_id : process.env.WORKSPACE_ID },
  version_date : '2018-01-10'
});

//Roting from /conversation?serach={user input word}
router.get('/', function(req, res, next) {

  //Request to Watson Conversation API & Respons  
  watosnConversationAPI(req, res); 
});

//Watson Conversation Q & A
function watosnConversationAPI(req, res) {

  //User Question
  var req_url = req.url;
  var search = req.query.text.replace(/\r?\n/g,"");  
  //console.log(req);
  console.log(search);

  //Get Answer from Watson
  var watsonAnswer = function(question) {

      //call watson conversation with Promise
      return new Promise(function(resolve, reject) {
        conversation.message({ input: { text: question} }, function(err, response) {

          //Return error
          if (err) {  
            reject(err);
            return;
          }

          //Care for not undersatnding intents.
          var intents = !Object.keys(response.intents).length ? 'not understatnd' : response.intents[0].intent;
          var confidence = !Object.keys(response.intents).length ? 0 : response.intents[0].confidence;

          //Return messages wiht success
          resolve(
            {
              intents : intents,
              confidence : confidence,
              conversation_id : response.context.conversation_id,
              text : response.output.text[0],
              nodes_visited : response.output.nodes_visited[0]
            }
          );
      });
    });
  };

  //Answer Formatting to JSON
  var answerFormat2Json = function(result) {

    //result log to STDOUT
    console.log(result);  

    //Error result setting
    if (result instanceof pt.TimeoutError) {
      //Timeout Error
      result.text = '大変申し訳ございません。ただいま、たくさんのお客様にご利用いただいております。ご案内にお時間かかってしまいます。\n\nお手数ですが、少しお時間経あけていただき、再度メッセージお送りお願いいたします。';
      result.intents = 'Timeout of 10sec';
      result.confidence = 0;
    } else if (result.error) {
      //Watson Converation API Error
      result.text = 'ご利用いただき、ありがとうございます。\n大変申し訳ありません。\nただいまシステムトラブルのため、ご案内させていただくことができません。\nサイト内ご質問やお問い合わせにつきましては、よくあるご質問をご確認いただくか、カスタマーサポートまでご連絡お願いいたします。&-&http//サイトFAQページ';
      result.intents = 'Watson conversation error';
      result.confidence = 0;
    } else if (result.confidence < 0.1) {
      //Confidence Error
      result.text = '大変申し訳ございません。私の理解不足でご案内することできません。\nお手数ですが、再度メッセージをご入力いただくか。カスタマーサポートまでご連絡お願いいたします。';
      result.intents = 'Not enough Confidene(<0.5)'; 
    }

    //Retrun formatting JSON answers
    return {
      searcher_id: result.conversation_id,
      url: req_url,
      text: search,
      answer_list: [
        {
          answer: result.text,
          class_name: result.intents,
          cos_similarity: 0.8226028135219948,
          confidence: result.confidence,
          answer_altered: true,
          question: null
        }
      ]
    };
  };

  //Response sendding
  var resResult = function(result) {
    res.header('Content-Type', 'application/json; charset=utf-8')
    res.send(answerFormat2Json(result));
  };

  //Call Watson Answer & response send(Timeout 10second)
  pt.timeout(watsonAnswer(search), 10000)
  .then(function(answer) {
    resResult(answer);
  }).catch(function(error) {
    console.error(error); //erorr log to STDERR 
    resResult(error);
  });

}

module.exports = router;
