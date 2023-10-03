require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const redis = require('redis');
const responseTime = require('response-time');
const cors = require('cors');
const path = require('path');

const PORT = process.env.PORT || 5000;

const client = redis.createClient(process.env.REDIS_ENDPOINT_URI, {
  password: process.env.REDIS_PASSWORD,
});

const app = express();

// Set response
function composeResponse(username, repos, cached) {
  return {
    username,
    repos,
    cached,
  };
}

// // Make request to Github for data
// async function getRepos(req, res, next) {
//   try {
//     const { username } = req.params;

//     const response = await fetch(`https://api.github.com/users/${username}`);

//     const data = await response.json();

//     const repos = data.public_repos;

//     if (!isNaN(repos)) {
//       client.setex(username, 3600, repos);
//       res.json(composeResponse(username, repos, false));
//     } else {
//       res.status(404);
//     }

//   } catch (err) {
//     console.error(err);
//     res.status(500);
//   }
// }

function cacheMiddleware(req, res, next) {
  const { username } = req.params;

  client.get(username, (err, data) => {
    if (err) throw err;

    if (data !== null) {
      res.json(composeResponse(username, data, true));
    } else {
      next();
    }
  });
}

function rateLimitMiddleware(req, res, next) {
  const ip = req.ip;
  const redis_key = `rate_limit:${ip}`;
  const rate_limit = 10; // Adjust the limit as needed
  const redis_period = 60; // Adjust the period in seconds as needed

  client.setnx(redis_key, rate_limit, (err, setnxResult) => {
    if (err) throw err;

    if (setnxResult === 1) {
      client.expire(redis_key, redis_period);
    }

    client.get(redis_key, (err, bucket_val) => {
      if (err) throw err;

      if (bucket_val && parseInt(bucket_val) > 0) {
        client.decrby(redis_key, 1, (err) => {
          if (err) throw err;
          next();
        });
      } else {
        client.ttl(redis_key, (err, remainingTime) => {
          if (err) throw err;

          // Return the key value and remaining time
          res.status(429).json({ error: `Key ${redis_key} rate limit exceeded! Wait for ${remainingTime} seconds.` });
        });
      }
    });
  });
}


// Make request to Github for data
async function getRepos(req, res, next) {
  try {
    const { username } = req.params;

    const response = await fetch(`https://api.github.com/users/${username}`);

    if (response.status === 404) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const data = await response.json();
    const repos = data.public_repos;

    if (!isNaN(repos)) {
      client.setex(username, 3600, repos);
      res.json({ username, repos, cached: false });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// Middleware
app.use('/', express.static(path.join(__dirname, '../public')));
app.use(responseTime());
app.use(cors({
  exposedHeaders: ['X-Response-Time'],
}));

// Rate Limiting Middleware applied to the getRepos route
app.get('/repos/:username', rateLimitMiddleware, cacheMiddleware, getRepos);

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

module.exports = app
