var db = require('./models');

var categories = {
 "metadata": {
  "version": 2,
  "www_path_prefix": "https://www.crunchbase.com/",
  "api_path_prefix": "https://api.crunchbase.com/v/2/",
  "image_path_prefix": "https://res.cloudinary.com/crunchbase-production/"
 },
 "data": {
  "paging": {
   "total_items": 861,
   "number_of_pages": 1,
   "current_page": 1,
   "sort_order": "name ASC",
   "items_per_page": 5000,
   "revision": 1428969351
  },
  "items": [
   {
    "created_at": 1388782699,
    "updated_at": 1425368447,
    "type": "Category",
    "name": "3D",
    "path": "category/3d/2e43393be05e1e660538c576d1a5c26b",
    "uuid": "2e43393be05e1e660538c576d1a5c26b",
    "number_of_organizations": 439
   },
   {
    "created_at": 1390547530,
    "updated_at": 1397964461,
    "type": "Category",
    "name": "Writers",
    "path": "category/writers/4729788e5e99aa31ade9cf275e2644b8",
    "uuid": "4729788e5e99aa31ade9cf275e2644b8",
    "number_of_organizations": 130
   },
   {
    "created_at": 1390218652,
    "updated_at": 1397964105,
    "type": "Category",
    "name": "Young Adults",
    "path": "category/young-adults/e2cc62391a970063a30ffe3b5d86161b",
    "uuid": "e2cc62391a970063a30ffe3b5d86161b",
    "number_of_organizations": 85
   }
  ]
 }
}

categories.data.items.forEach(function(obj) {
	db.Category.create(obj)
  	.then(function() {
  		console.log('done');
  	});
});