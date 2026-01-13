
/**
 * 这是一个简易的云端同步服务
 * 利用公共存储 API 实现数据的跨设备迁移
 */

const API_BASE = 'https://jsonblob.com/api/jsonBlob';

export const uploadToCloud = async (data: any): Promise<string | null> => {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('上传失败');
    
    // 从响应头的 Location 中提取唯一的 Blob ID
    const location = response.headers.get('Location');
    if (location) {
      return location.split('/').pop() || null;
    }
    return null;
  } catch (error) {
    console.error('Cloud Sync Upload Error:', error);
    return null;
  }
};

export const downloadFromCloud = async (id: string): Promise<any | null> => {
  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('下载失败，请检查同步码是否正确');
    
    return await response.json();
  } catch (error) {
    console.error('Cloud Sync Download Error:', error);
    return null;
  }
};
