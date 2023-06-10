const searchHelper= (searchKey,query,req) => {
    if(req.query.search) {
        const searchObject = {};

        const regex = new RegExp(req.query.search,"i");
        searchObject[searchKey] = regex;

        return query.where(searchObject);
    }
    return query;
};
const populateHelper= (query,population) => {
    return query.populate(population);
};

const productSortHelper= (query,req) => {
    const sortKey = req.query.sortBy;
    if(sortKey=== "lowest-price") {
        return query.sort({price: 1, createdAt:-1});
    }
    else if(sortKey=== "highest-price") {
        return query.sort({price: -1, createdAt:-1});
    }
    else if(sortKey=== "most-favorited") {
        return query.sort({star: -1, createdAt:-1});
    }
    return query.sort({createdAt:-1});
};
const commentSortHelper= (query,req) => {
    const sortKey = req.query.sortBy;
    
    if(sortKey=== "lowest-star") {
        return query.sort({star: 1, createdAt:-1});
    }
    else if(sortKey=== "highest-star") {
        return query.sort({star: -1, createdAt:-1});
    }
    return query.sort({createdAt:-1});
};
const sellerSortHelper= (query,req) => {
    const sortKey = req.query.sortBy;
    
    if(sortKey=== "lowest-follower") {
        return query.sort({"seller.followerCount": 1, createdAt:-1});
    }
    else if(sortKey=== "highest-follower") {
        return query.sort({"seller.followerCount": -1, createdAt:-1});
    }
    return query.sort({createdAt:-1});
};

const paginationHelper= async (totalDocument,query,req) => {
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    
    const startIndex = (page-1)*limit;
    const endIndex = page*limit;

    const pagination = {};
    const total = totalDocument;
    if(startIndex > 0) {
        pagination.previous = {
            page: page-1,
            limit: limit
        };
    }

    if(endIndex < total) {
        pagination.next = {
            page: page+1,
            limit: limit
        };
    }
    return {
        query: query===undefined ? undefined : query.skip(startIndex).limit(limit),
        pagination: pagination,
        startIndex,
        limit
    };
};

module.exports = {
    searchHelper,
    populateHelper,
    productSortHelper,
    paginationHelper,
    commentSortHelper,
    sellerSortHelper
};