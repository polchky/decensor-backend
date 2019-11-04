const constants = {
    db: {
        name: 'decensor',
        options: {
            useCreateIndex: true,
            useNewUrlParser: true,
            useFindAndModify: false,
            useUnifiedTopology: true,
        },
    },
    thresholds: {
        subsToGetSubs: 1000,
        subsToGetUploads: 100000,
        vidsPerDayToGetUploads: 1.5,
        daysBetweenVideosChecks: 30,
        daysBetweenPlaylistItemsChecks: 15,
        daysToStablilizeVideos: 30,
    },
    thumbnail: {
        prefix: 'https://yt3.ggpht.com/',
        delimiter: '=',
    },
    status: {
        channel: {
            new: 'new',
            active: 'active',
            small: 'small',
            spam: 'spam',
            private: 'private',
            unreachable: 'unreachable',
        },
        video: {
            new: 'new',
            active: 'active',
            unreachable: 'unreachable',
            archived: 'archived',
        },
    },
    decensorApi: {
        maxResults: 50,
    },
    youtubeApi: {
        maxResults: 50,
        dailyQuotas: 10000,
        concurrentRequests: 5,
    },
};

module.exports = constants;
