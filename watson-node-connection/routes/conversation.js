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
  var req_url = decodeURIComponent(req.url);
  var search = req.query.text.replace(/\r?\n/g,"");  
  //console.log(req);
  console.log(search);

  //Get Answer from Watson conversation
  var watsonAnswer = function(question) {

      //call watson conversation with Promise
      return new Promise(function(resolve, reject) {
        conversation.message({ input: { text: question} }, function(err, response) {

          //Return error
          if (err) {  
            reject(err);
            return;
          }

          //Intents & Entities, Confidense setting
          if (!Object.keys(response.intents).length && !Object.keys(response.entities).length) {
            //intents & entities are both nothing.
            var intents = 'not understatnd';
            var entities = 'not understatnd';
            var confidence = [ 0, 0 ];
          } else if (Object.keys(response.intents).length && !Object.keys(response.entities).length) {
            //intents is, but entities is nothing.
            var intents = response.intents[0].intent;
            var entities = 'nothing';
            var confidence = [ response.intents[0].confidence, 0 ];
          } else if (!Object.keys(response.intents).length && Object.keys(response.entities).length) {
            //intents is nothing, but entities is.
            var intents = 'nothing';
            var entities = response.entities[0].entity;
            var confidence = [ 0, response.entities[0].confidence ];
          } else {
            var intents = response.intents[0].intent;
            var entities = response.entities[0].entity;
            var confidence = [ response.intents[0].confidence, response.entities[0].confidence];
          }

          //Return messages wiht success
          resolve(
            {
              intents : intents,
              entities : entities,
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

    var timeout_sec = 0.01

    //Error result setting
    if (result instanceof pt.TimeoutError) {
      //Timeout Error
      result.text = '大変申し訳ございません。ただいま、たくさんのお客様にご利用いただいております。ご案内にお時間かかってしまいます。\n\nお手数ですが、少しお時間経あけていただき、再度メッセージお送りお願いいたします。';
      result.intents = 'Timeout of 10sec';
      result.entities = 'Timeout of 10sec';
      result.confidence = [ 0, 0 ];
    } else if (result.error) {
      //Watson Converation API Error
      result.text = 'ご利用いただき、ありがとうございます。\n大変申し訳ありません。\nただいまシステムトラブルのため、ご案内させていただくことができません。\nサイト内ご質問やお問い合わせにつきましては、よくあるご質問をご確認いただくか、カスタマーサポートまでご連絡お願いいたします。&-&http//サイトFAQページ';
      result.intents = 'Watson conversation error';
      result.entities = 'Watson conversation error';
      result.confidence = [ 0, 0 ];
    } else if (result.confidence < timeout_sec) {
      //Confidence Error
      result.text = '大変申し訳ございません。私の理解不足でご案内することできません。\nお手数ですが、再度メッセージをご入力いただくか。カスタマーサポートまでご連絡お願いいたします。';
      result.intents = 'Not enough Confidene(<' + timeout_sec + ')'; 
      result.entities = 'Not enough Confidene(<' + timeout_sec + ')'; 
    }

    //Retrun formatting JSON answers
    return {
      searcher_id: result.conversation_id,
      url: req_url,
      text: search,
      answer_list: [
        {
          answer: result.text,
          intents: result.intents,
          entities: result.entities,
          cos_similarity: 0.8,
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
