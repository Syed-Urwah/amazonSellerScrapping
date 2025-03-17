import {
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
    Handler
} from "aws-lambda";

const handler: Handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    return {
        statusCode: 200,
        body: JSON.stringify(
            {
                message: "Test message from taxcreditwiz-serverless TypeScript",
                input: event,
            },
            null,
            2
        ),
    };
};

export {handler}