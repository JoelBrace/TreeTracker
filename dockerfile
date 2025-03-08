FROM node:20.12.2

# Set the working directory inside the container
WORKDIR /app

# Clone the repository
RUN git clone https://github.com/JoelBrace/TreeTracker.git .

# Install dependencies
RUN npm install

# Compile TypeScript code
RUN npx tsc

# Start the application
CMD ["node", "--env-file", ".env", "app.js"]
