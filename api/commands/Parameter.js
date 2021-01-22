const err = bot.err;

/**
 * A Parameter object is used to store information about one single parameter of a command.
 * It stores crucial information about:
 * - it's type: Which can be 'required' or 'optional'. If the type is 'required' it's not possible to execute the
 * command without this parameter set.
 * - its' dependent parameters: A parameter can require other parameters to be set. If the other parameters aren't
 * set by the user and they have the default_construct set to true, the default_args are written as arguments for
 * the required parameter. Otherwise an error will be thrown, urging the user to provide the required parameter with
 * it's values.
 * - it's arg_check_lambda: Currently there is no possibility to check for anything else than the number of
 * arguments provided to a parameter. This lambda should return true, when the number of arguments matches the
 * expected number of arguments. As an example you could check, if there is an even number of arguments (and they are
 * at least 2) with the following lambda. (nr) => nr >= 2 && nr % 2 == 0
 * - it's default args: If the parameter can be self constructed this array specifies the arguments to be set.
 * - Whether it can be self constructed (default construct)
 *
 * @see Command
 *
 * @author Felix Ludwig
 */
export default class Parameter {
	/**
	 * Constructor of the Parameter-class.
	 *
	 * @param parname the name of the parameter starting with a minus.
	 * @param type either 'required' or optional
	 * @param dependent_params an array of parameter-names this parameter depends on to be set
	 * @param description to be shown to the user
	 * @param arg_check_lambda the lambda to check for the number of arguments provided by the user
	 * @param default_args an array of arguments to be set, if default_construct is true and either 'required' is the
	 * type of this parameter OR another parameter depends on this parameter and needs to construct this.
	 * @param default_construct whether it should be possible to self construct this parameter with the default_args.
	 */
	constructor(
		parname,
		type,
		dependent_params,
		description,
		arg_check_lambda,
		default_args,
		default_construct
	) {
		this.parname = parname; //starts with minus
		if (!parname.startsWith("-")) throw new err.InvalidData();
		this.type = type;
		this.dependent_params = dependent_params; /* [name] Anmerkung: default_construct bestimmt nun darüber*/
		this.description = description;
		this.arg_check_lambda = arg_check_lambda;
		this.default_args = default_args;
		this.default_construct = default_construct; /*this is just constucted, when 'required' is set. This gets not checked, if it's the dependent_param of another param and it has requested to default construct this*/
	}
}