const ToolEngine = {
    _tools: [],
  
    register(tools) {
      this._tools = tools;
    },
  
    get definitions() {
      return this._tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema
      }));
    },
  
    async execute(name, input) {
      const tool = this._tools.find(t => t.name === name);
      if (!tool) return { error: `Tool "${name}" not found` };
      try {
        const result = await tool.execute(input);
        return result;
      } catch (err) {
        return { error: err.message };
      }
    }
  };
  
  export default ToolEngine;