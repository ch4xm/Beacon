export type SessionUser = {
    id: string;
};

declare global {
    namespace Express {
        export interface Request {
            user: SessionUser;
        }
    }
}

export type GeoJSON = {
	type: string;
	features: Array<{
		type: string;
		geometry: {
			type: string;
			coordinates: [number, number];
		};
		properties: {
			id?: number;
			creatorID?: number;
			title?: string;
			location?: string;
			description: string;
			image: string;
			color: string;
			email?: string;
			address?: string;
		};
	}>;
}