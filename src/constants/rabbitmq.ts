export const RABBITMQ_SERVICE = 'RABBITMQ_SERVICE';
export const RABBITMQ_EXCHANGE_TYPE = 'topic';

// Request/reply patterns served to catalog-api and orders-api over RabbitMQ.
export const YAUCTIONS_PRODUCTS_LIST_PATTERN = 'yauctions.products.list';
export const YAUCTIONS_PRODUCTS_GET_PATTERN = 'yauctions.products.get';
export const YAUCTIONS_PRODUCTS_VALIDATE_PATTERN =
	'yauctions.products.validate';
export const YAUCTIONS_CATEGORIES_LIST_PATTERN = 'yauctions.categories.list';
