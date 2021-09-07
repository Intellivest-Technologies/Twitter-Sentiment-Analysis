const request = require('request');
var Sentiment = require('sentiment');
const fs = require('fs');

// what to search for
var searchString = '$TSLA @tesla'

const options = {
   url: 'https://api.twitter.com/1.1/search/tweets.json?q='+searchString+'&lang=en&count=100&result_type=recent&include_entities=1',
   headers: {
      'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAAJBD%2BQAAAAAABouyxmfwLPWWvLr9FwE7JTF0IG4%3DAxdWOjcl5xInwjuMMTAqR8jIFN9XHyPYjALUESpMIYs5SNYF2s'
   }
};

function callback(error, response, body) {
   if (!error && response.statusCode == 200) {
      var arr = JSON.parse(body).statuses
      var tweets = arr.map(function (e) {
         var t = e.text.replace(/\n|\r/g, "").replace(/(?:https?|ftp):\/\/[\n\S]+/g, '').replace(/\@[^\s]*/g, "").replace(/\$[^\s]*/g, "").replace(/\#[^\s]*/g, "").replace('RT', '').replace('NEW', '').replace('//   // ', '').replace('- ', '').trim().toString()
         var result = new Sentiment().analyze(t);
         
         // totalScore is the comparative score * number of likes/shares
         var totalScore
         var s = ((!e.retweet_count ? 0 : e.retweet_count) + (!e.favorite_count ? 0 : e.favorite_count))
         if (s > 0) totalScore = s * result.comparative
         else totalScore = result.comparative // else return false
         
         return {
            likes: e.favorite_count,
            shares: e.retweet_count,
            content: t,
            score: result.score,
            comparative: result.comparative,
            total: totalScore
         };
      });

      // remove duplicate tweets
      tweets = tweets.reduce((r, i) => !r.some(j => !Object.keys(i).some(k => i[k] !== j[k])) ? [...r, i] : r, [])
      
      console.log(tweets)
      
      // save to csv file
      fs.writeFile("./data.csv", CSV(tweets), (err) => { console.log(err || "done"); });
   }
}

request(options, callback);

// helpers

// format array of objects to CSV
function CSV(array) {
   var keys = Object.keys(array[0]);
   var result = keys.join("\t") + "\n";
   array.forEach(function (obj) {result += keys.map(k => obj[k]).join("\t") + "\n";});
   return result;
}