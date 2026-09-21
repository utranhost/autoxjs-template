import * as logger from './logger.js'
import { showRecents } from './tools/recent_manager.js'

logger.log('hello world')
logger.warn('hello world')
logger.error('hello world')
logger.success('hello world')

showRecents()
