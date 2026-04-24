import { EventEmitter } from 'events';

const globalForEvents = global as unknown as { eventEmitter: EventEmitter };

export const eventEmitter = globalForEvents.eventEmitter || new EventEmitter();

// Ensure in development that the emitter is not recreated on every hot reload
if (process.env.NODE_ENV !== 'production') {
    globalForEvents.eventEmitter = eventEmitter;
}
