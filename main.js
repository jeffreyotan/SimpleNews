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

// for implementing a simple cache
const localCache = new Map();
const processNewsAPIData = (articles) => {
    let newsArticles = [];
    articles.forEach( (element) => {
        newsArticles.push({
            title: element['title'],
            urlToImage: element['urlToImage'],
            summary: element['description'],
            publishTime: element['publishedAt'],
            articleLink: element['url']
        });
    });
    return newsArticles;
};

// setup the different middlewares to handle to possible routes
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
    // console.info('Final url: ', url);

    let hasArticles = false;
    let newsArticles = [];
    let newsData;

    const result = await fetch(url);

    if(false && localCache.has(url)) {
        console.info(`Subsequent use of ${url}`);
        hasArticles = true;
        newsArticles = processNewsAPIData(localCache.get(url));
        newsArticles.forEach( (element) => {
            console.info('===============');
            console.info(`Cached data is ${JSON.stringify(element)}`);
        });
    } else {
        console.info(`First use of ${url}`);
        try {
            newsData = await result.json();
        } catch(e) {
            console.error(e);
            res.status(500).type('text/html');
            res.send("<h1>An internal server error occurred.</h1>");
            return Promise.reject(e);
        }
    
        // console.info(newsData);
    
        if(newsData['status'] === 'ok' && newsData['articles'].length > 0) {
            hasArticles = true;
            newsArticles = processNewsAPIData(newsData['articles']);
            /* no need after implementing cache
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
            // console.info(newsArticles); */
    
            //cache the results
            localCache.set(url, newsArticles);
            const newsArray = localCache.get(url);
            newsArray.forEach( (element) => {
                console.info(`Data cached is ${JSON.stringify(element)}`);
            });
        }
    }

    res.status(200).type('text/html');
    res.render('search', { hasArticles, newsArticles });
});

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
