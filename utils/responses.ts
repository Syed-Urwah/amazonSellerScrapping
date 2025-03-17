import { APIGatewayProxyResultV2 } from 'aws-lambda';

export async function createErrorResponse(status: number, message: string): Promise<APIGatewayProxyResultV2> {
  const body = JSON.stringify({ status, message });
  return {
      statusCode: status,
      body,
      headers: {
          "Content-Type": "application/json"
      }
  };
  }
  
  export async function createSuccessResponse(status: number, message: string, data: any): Promise<APIGatewayProxyResultV2> {
    const body = JSON.stringify({ status, message, data });

    return {
        statusCode: status,
        body,
        headers: {
            "Content-Type": "application/json"
        }
    };
}
