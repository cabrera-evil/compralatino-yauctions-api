import { RABBITMQ_EXCHANGE_TYPE, RABBITMQ_SERVICE } from '@/constants/rabbitmq';
import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

const isRabbitMqEnabled = process.env.RABBITMQ_ENABLED === 'true';

@Global()
@Module({
	imports: isRabbitMqEnabled
		? [
				ClientsModule.registerAsync([
					{
						name: RABBITMQ_SERVICE,
						useFactory: () => ({
							transport: Transport.RMQ,
							options: {
								urls: [process.env.RABBITMQ_URL],
								queue: process.env.RABBITMQ_QUEUE,
								exchange: process.env.RABBITMQ_EXCHANGE,
								exchangeType: RABBITMQ_EXCHANGE_TYPE,
								wildcards: true,
								queueOptions: { durable: true },
							},
						}),
					},
				]),
			]
		: [],
	exports: isRabbitMqEnabled ? [ClientsModule] : [],
})
export class RabbitMqConfig {}
