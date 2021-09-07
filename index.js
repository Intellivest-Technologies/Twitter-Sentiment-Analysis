const request = require('request')
var Sentiment = require('sentiment')
const fs = require('fs')

// twitter handles
var handles = {
   TSLA: 'tesla',
   DIS: 'disney',
   AVID: 'Avid',
   FB: 'Facebook',
   AMZN: 'Amazon',
   AAPL: 'Apple',
   AAL: 'AmericanAir',
   COIN: 'coinbase',
   UBER: 'uber',
   CCL: 'CarnivalCruise',
   F: 'ford'
}

var symbol// = 'TSLA'

process.argv.forEach(function (val, index, array) { symbol = val })

// what to search for
var searchString = '$' + symbol + handles[symbol] ? ' @' + handles[symbol] : ""

const options = {
   url: 'https://api.twitter.com/1.1/search/tweets.json?q=' + searchString + '&lang=en&count=100&result_type=recent&include_entities=1',
   headers: {
      'Authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAAJBD%2BQAAAAAABouyxmfwLPWWvLr9FwE7JTF0IG4%3DAxdWOjcl5xInwjuMMTAqR8jIFN9XHyPYjALUESpMIYs5SNYF2s'
   }
}

// add custom word ratings
var sentimentOptions = {
   extras: {
      '💀': -4,
      '🤩': 5,
      '😅': -2,
      '😭': 2,
      '😝': -2,
      '🤡': -5,
      '🤬': -5,
      '😡': -3,
      '💩': -2,
      '🚀': 5,
      '💯': 5,
      '❤️': 5,
      '❌': -3,
      '💲': 3,
      '✔️': 3,
      '💰': 4,
      '🔑': 2,
      '🏆': 4,
      '🥇': 4
   }
}

function callback(error, response, body) {
   if (!error && response.statusCode == 200) {
      var arr = JSON.parse(body).statuses
      var tweets = arr.reduce((r, i) => !r.some(j => !Object.keys(i).some(k => i[k] !== j[k])) ? [...r, i] : r, [])
      var allSentiment = []
      var allRatings = []
      tweets = arr.map(function (e) {
         var t = e.text.replace(/\n|\r/g, "").replace(/(?:https?|ftp):\/\/[\n\S]+/g, '').replace(/\@[^\s]*/g, "").replace(/\$[^\s]*/g, "").replace(/\#[^\s]*/g, "").replace('RT', '').replace('NEW', '').replace('//   // ', '').replace('- ', '').trim()
         t = replaceEmojis(t)
         var result = new Sentiment().analyze(t, sentimentOptions)
         allSentiment.push(result)

         if (result.comparative != 0)
            allRatings.push(result.comparative)
         return {
            likes: e.favorite_count,
            shares: e.retweet_count,
            content: t,
            score: result.score,
            comparative: result.comparative
         }
      })

      // log the total average
      console.log(avg(allRatings))
      // remove duplicate tweets
      var tweets1 = tweets.reduce((r, i) => !r.some(j => !Object.keys(i).some(k => i[k] !== j[k])) ? [...r, i] : r, [])

      // overview of each tweet's rating
      fs.writeFile("./data.csv", CSV(tweets1))

      // full breakdown of logic behind rating
      fs.writeFile("./logic.csv", JSON.stringify(allSentiment, null, 2))
   }
}

request(options, callback)

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