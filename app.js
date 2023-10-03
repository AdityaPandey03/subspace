import express from 'express';
import fetch from 'node-fetch';
import _ from 'lodash';

const app = express();
const PORT = 3000;

app.use(express.json());

// Data Retrieval Middleware
app.use('/api/blog-stats', async (req, res, next) => {
    try {
        const apiUrl = 'https://intent-kit-16.hasura.app/api/rest/blogs';
        const options = {
            method: 'GET',
            headers: {
                'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6',
            },
        };

        const response = await fetch(apiUrl, options);
        const data = await response.json();

        req.blogData = data.blogs;
        console.log('Received data 1:', req.blogData); 
        next();
    } catch (error) {
        console.error('Error fetching blog data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Data Analysis Middleware
const memoizedAnalytics = _.memoize((blogs) => {
    const totalBlogs = blogs.length;
    const longestBlog = _.maxBy(blogs, 'title.length');
    const privacyBlogs = _.filter(blogs, (blog) =>
        _.includes(_.toLower(blog.title), 'privacy')
    );
    const uniqueTitles = _.uniqBy(blogs, 'title');

    return {
        totalBlogs,
        longestBlog: longestBlog ? longestBlog.title : 'N/A',
        privacyBlogs: privacyBlogs.length,
        uniqueTitles: uniqueTitles.map((blog) => blog.title),
    };
});

app.use('/api/blog-stats', (req, res) => {
    const blogs = req.blogData;

    console.log('Received data:', blogs);

    if (!Array.isArray(blogs)) {
        console.error('Invalid data format:', req.blogData);
        return res.status(500).json({ error: 'Invalid data format' });
    }

    if (blogs.length === 0) {
        return res.status(404).json({ error: 'No blogs found' });
    }

    const stats = memoizedAnalytics(blogs);
    res.json(stats);
});

// Blog Search Middleware
const memoizedBlogSearch = _.memoize((query, blogs) => {
    if (!query || !Array.isArray(blogs)) {
        return [];
    }

    return _.filter(blogs.data, (blog) =>
        _.includes(_.toLower(blog.title), _.toLower(query))
    );
});

app.get('/api/blog-search', (req, res) => {
    const { query } = req.query;
    const blogs = req.blogData;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter "query" is required' });
    }

    const searchResults = memoizedBlogSearch(query, blogs);

    res.json(searchResults);
});


// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
