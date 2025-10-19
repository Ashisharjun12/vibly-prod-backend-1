import User from "../models/user.model.js";
import { _config } from "../config/config.js";
import logger from "./logger.js";

// Role change function when db connects
export const createAdminUser = async () => {
    try {
     

        const existingUser = await User.findOne({ email: _config.ADMIN_EMAIL });
        
        if (existingUser) {
           
            if (existingUser.role !== 'Admin') {
                existingUser.role = 'Admin';
                await existingUser.save();
                logger.info(`Updated user ${_config.ADMIN_EMAIL} to Admin role`);
            } else {
                logger.info(`User ${_config.ADMIN_EMAIL} already has Admin role`);
            }
            return existingUser;
        } 
    } catch (error) {
        logger.error('Error creating/updating admin user:', error);
        return null;
    }
}

