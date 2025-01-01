class AggregateFunction extends internal.AbstractEnum {
    constructor() {
        super(...arguments);
        this.qualifiedTsTypeName = "pages.AggregateFunction";
    }
}
AggregateFunction.None = new AggregateFunction("None", {});
AggregateFunction.Average = new AggregateFunction("Average", {});
AggregateFunction.Maximum = new AggregateFunction("Maximum", {});
AggregateFunction.Minimum = new AggregateFunction("Minimum", {});
AggregateFunction.Sum = new AggregateFunction("Sum", {});
AggregateFunction.Count = new AggregateFunction("Count", {});
pages.AggregateFunction = AggregateFunction;