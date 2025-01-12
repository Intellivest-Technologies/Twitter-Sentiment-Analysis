const request = require('request')
var Sentiment = require('sentiment')
const fs = require('fs')
var symbols = ['TSLA', 'DIS', 'AVID', 'FB', 'AMZN', 'AAL', 'COIN', 'UBER', 'CCL', 'F']

// twitter handles
var handles = {
   DIS: 'disney',
   AVID: 'Avid',
   FB: 'Facebook',
   AMZN: 'Amazon',
   AAPL: 'Apple',
   AAL: 'AmericanAir',
   TSLA: 'elonmusk',
   COIN: 'coinbase',
   UBER: 'uber',
   CCL: 'CarnivalCruise',
   F: 'ford'
}

process.argv.forEach(function (val, index, array) {
   if (val == 'TEST') testMultiple()
   else testOne(val)
})

// add custom word ratings
var sentimentOptions = {
   extras: {
      '💀': -3,
      '🤩': 5,
      '😅': -2,
      '😭': 2,
      '😝': -2,
      '🤡': -3,
      '🤬': -1,
      '😡': -1,
      '💩': -2,
      '🚀': 3,
      '💯': 5,
      '❤️': 3,
      '❌': -3,
      '💲': 3,
      '✔️': 3,
      '💰': 4,
      '🔑': 2,
      '🏆': 4,
      '🥇': 4,
      '👀': 1,
      '✨': 2,
      '🎉': 2,
      '💖': 2,
      '⭐': 2,
      '🚨': 1,
      '💎': 3
   }
}

// a fix to make emojis detectable (adds spaces surrounding each emoji)
const replaceEmojis = function (string) {
   const emojis = string.match(/[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/ug)
   if (!emojis) return string
   emojis.forEach(emoji => {
      let unicode = ""
      function getNextChar(pointer) {
         const subUnicode = emoji.codePointAt(pointer)
         if (!subUnicode) return
         unicode += '-' + subUnicode.toString(16)
         getNextChar(++pointer)
      }
      getNextChar(0)
      unicode = unicode.substr(1)
      string = string.replace(emoji, " " + emoji + " ")
   })
   return string
}

function callback(error, response, body, symbol) {
   if (!error && response.statusCode == 200) {
      var arr = JSON.parse(body).statuses
      var tweets = arr.reduce((r, i) => !r.some(j => !Object.keys(i).some(k => i[k] !== j[k])) ? [...r, i] : r, [])
      var logic = []
      var ratings = []
      tweets = arr.map(function (e) {

         //if(e.text.includes('RT @')) return ""

         var t = e.text.replace(/\n|\r/g, "").replace(/(?:https?|ftp):\/\/[\n\S]+/g, '').replace(/\@[^\s]*/g, "").replace(/\$[^\s]*/g, "").replace(/\#[^\s]*/g, "").replace('RT', '').replace('NEW', '').replace('//   // ', '').replace('- ', '').trim()
         t = replaceEmojis(t)
         var result = new Sentiment().analyze(t, sentimentOptions)

         if (result.comparative != 0 && !t.includes('undefined')) {
            ratings.push(result.comparative)
            logic.push(result)
         }

         return {
            comparative: result.comparative.toFixed(3),
            score: result.score,
            content: t,
            engagement: e.favorite_count + e.retweet_count,
            //location: e.user.location,
            //user: e.user.screen_name,
            //influence: e.user.followers_count
         }

      })

      // log the total average
      console.log('Score: ' + avg(ratings))

      // remove duplicate tweets & tweets that score 0 sentiment
      var data = tweets.filter(function (e) {
         return (e.comparative != 0) ? e : null;
      }).reduce((r, i) => !r.some(j => !Object.keys(i).some(k => i[k] !== j[k])) ? [...r, i] : r, []);

      // overview of each tweet's rating
      fs.writeFile("./results/data/" + symbol + ".csv", CSV(data), (err) => { console.log(data) });

      // full breakdown of logic behind rating
      fs.writeFile("./results/logic/" + symbol + ".csv", JSON.stringify(logic, null, 2), (err) => { console.log(err) });
   }
}

function testOne(e) {
   var symbol = e
   var searchString = '$' + symbol + handles[symbol] ? ' @' + handles[symbol] : ""
   const options = {
      url: 'https://api.twitter.com/1.1/search/tweets.json?q=' + searchString + '&lang=en&count=30&result_type=recent&include_entities=1',
      headers: {
         'Authorization': 'Bearer ' + process.env. TWITTER_API_KEY
      }
   }
   function requestWithSymbol(error, response, body) {
      callback(error, response, body, symbol)
   };
   request(options, requestWithSymbol)
}

function testMultiple() {
   for (let i = 0; i < symbols.length; i++) {
      function requestWithSymbol(error, response, body) {
         callback(error, response, body, symbols[i])
      };
      var symbol = symbols[i]
      var searchString = '$' + symbol + handles[symbol] ? ' @' + handles[symbol] : ""
      const options = {
         url: 'https://api.twitter.com/1.1/search/tweets.json?q=' + searchString + '&lang=en&count=100&result_type=recent&include_entities=1',
         headers: {
            'Authorization': 'Bearer ' + process.env. TWITTER_API_KEY
         }
      }
      request(options, requestWithSymbol)
   }
}

// helpers

// format array of objects to CSV
function CSV(array) {
   var keys = Object.keys(array[0])
   var result = keys.join("\t") + "\n"
   array.forEach(function (obj) { result += keys.map(k => obj[k]).join("\t") + "\n"; })
   return result
}

// average from array
function avg(e) {
   var total = 0
   for (var i = 0; i < e.length; i++) { total += e[i] }
   var avg = total / e.length
   return avg
}
