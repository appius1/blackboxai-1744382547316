import { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateSpec } from 'tsoa';

export const setupSwagger = async (app: Application) => {
  try {
    // Generate Swagger specification
    const swaggerSpec = await generateSpec({
      entryFile: 'src/server.ts',
      outputDirectory: 'src/generated',
      noImplicitAdditionalProperties: 'throw-on-extras',
      controllerPathGlobs: ['src/**/*.controller.ts'],
      spec: {
        info: {
          title: 'Appius API',
          version: '1.0.0',
          description: 'API documentation for the Appius website builder platform',
          contact: {
            name: 'API Support',
            email: 'support@appius.com',
          },
        },
        servers: [
          {
            url: '/api/v1',
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
        tags: [
          { name: 'Auth', description: 'Authentication endpoints' },
          { name: 'Websites', description: 'Website management' },
          { name: 'Products', description: 'E-commerce product management' },
          { name: 'Collections', description: 'Product collections' },
          { name: 'Subscriptions', description: 'Subscription management' },
          { name: 'Analytics', description: 'Analytics and reporting' },
        ],
      },
    });

    // Serve Swagger documentation
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Appius API Documentation',
    }));

    // Serve Swagger JSON
    app.get('/swagger.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    console.log('✨ Swagger documentation initialized');
  } catch (error) {
    console.error('Failed to initialize Swagger:', error);
    throw error;
  }
};
