import {APIGatewayProxyResultV2} from "aws-lambda";

type headers = {[p: string]: string | number | boolean}

export const OK = (data: any, headers?: headers) : APIGatewayProxyResultV2 => {
    return {
        statusCode: 200,
        body: JSON.stringify(data),
        headers: {
            'content-type': 'application/json',
            ...headers
        }
    }
}
export const BADREQUEST = (body: string, headers?: headers) : APIGatewayProxyResultV2 => {
    return {
        statusCode: 400,
        body,
        headers
    }
}
export const NOTFOUND = (body: string, headers?: headers) : APIGatewayProxyResultV2 => {
    return {
        statusCode: 404,
        body,
        headers
    }
}
