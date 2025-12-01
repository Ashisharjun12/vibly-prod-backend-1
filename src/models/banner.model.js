import { Schema, model } from "mongoose";

const bannerSchema = new Schema(
    {
        image: {
            public_id: String,
            url: String,
        },
        link: {
            type: String,
            default: '',
        },
        order: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        saleActive: {
            type: Boolean,
            default: false,
        },
    }
);

const Banner = model("Banner", bannerSchema);
export default Banner;
