// load required libraries and modules
const express = require('express');
const handlebars = require('express-handlebars');
const fetch = require('node-fetch');
const withQuery = require('with-query').default;

// configure the port used and other globals
const PORT = parseInt(process.argv[2]) || parseInt(process.env.API_PORT) || 3000;
const BASEURL = "https://newsapi.org/v2/top-headlines"
const API_KEY = process.env.API_KEY || ""

// create an instance of express
const app = express();

// configure express to use handlebars
app.engine('hbs', handlebars({ defaultLayout: 'default.hbs' }));
app.set('view engine', 'hbs');

app.get('/', (req, res, next) => {
    res.status(200).type('text/html');
    res.render('index');
});

app.get('/search', async (req,res,next) => {
    const receivedParams = {
        searchKey: req.query['searchKey'],
        country: req.query['country'],
        category: req.query['category']
    };
    console.info('Received Params: ', receivedParams);

    // create the search string and search NewsAPI for the requested information
    const url = withQuery(
        BASEURL,
        {
            apiKey: API_KEY,
            q: receivedParams.searchKey,
            country: receivedParams.country,
            category: receivedParams.category
        }
    )
    console.info('Final url: ', url);

    const result = await fetch(url);

    let newsData;
    try {
        newsData = await result.json();
    } catch(e) {
        console.error(e);
        res.status(500).type('text/html');
        res.send("<h1>An internal server error occurred.</h1>");
        return Promise.reject(e);
    }

    // console.info(newsData);
    let hasArticles = false;
    let newsArticles = [];
    if(newsData['status'] === 'ok' && newsData['articles'].length > 0) {
        hasArticles = true;
        const articles = newsData['articles'];

        articles.forEach( (element) => {
            newsArticles.push({
                title: element['title'],
                urlToImage: element['urlToImage'],
                summary: element['description'],
                publishTime: element['publishedAt'],
                articleLink: element['url']
            });
        });
        // console.info(newsArticles);
    }

    res.status(200).type('text/html');
    res.render('search', { hasArticles, newsArticles });
});

// setup the different middlewares to handle to possible routes
app.use(express.static(__dirname + '/public'));

// start the express server if an API_KEY is present
if(API_KEY)
{
    app.listen(PORT, () => {
        console.info(`Server started on port ${PORT} at ${new Date()}`);
    });
} else {
    console.error('Invalid API_Key. Please input a valid API_KEY.');
}
