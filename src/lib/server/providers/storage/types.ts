export type StorageObjectMeta = {
	restaurantId: string;
	sourceType: 'menu-import' | 'item-image' | 'knowledge-attachment';
	fileName: string;
	mimeType: string;
	sizeBytes: number;
};

export type StorageUploadResult = {
	objectKey: string;
	publicUrl: string;
	provider: string;
};

export type StorageDeleteResult = {
	objectKey: string;
	deleted: boolean;
	provider: string;
};

export interface StorageProvider {
	storeFile(buffer: Uint8Array, meta: StorageObjectMeta): Promise<StorageUploadResult>;

	getPublicUrl(objectKey: string): Promise<string | null>;

	deleteFile(objectKey: string): Promise<StorageDeleteResult>;
}
