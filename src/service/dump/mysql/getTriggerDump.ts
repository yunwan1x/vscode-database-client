import { DatabaseType } from '@/common/constants';
import { Node } from '@/model/interface/node';
import { TriggerDumpOptions } from './interfaces/Options';

interface ShowTriggers {
    Trigger: string;
    Event: 'INSERT' | 'UPDATE' | 'DELETE';
    Table: string;
    Statement: string;
    Timing: 'BEFORE' | 'AFTER';
    sql_mode: string;
    Definer: string;
    character_set_client: string;
    coallation_connection: string;
    'Database Collation': string;
}
interface ShowCreateTrigger {
    Trigger: string;
    sql_mode: string;
    'SQL Original Statement': string;
    character_set_client: string;
    coallation_connection: string;
    'Database Collation': string;
}

async function getTriggerDump(node: Node, sessionId: string, options: Required<TriggerDumpOptions>, triggers: Array<string>): Promise<string> {
    if (triggers.length === 0) {
        return "";
    }

    // we create a multi query here so we can query all at once rather than in individual connections
    const getSchemaMultiQuery = triggers.map(trigger => {
        return node.dialect.showTriggerSource(node.schema, trigger)
    }).join("")

    const result = await node.multiExecute(getSchemaMultiQuery, sessionId) as ShowCreateTrigger[][];
    const output=result.map(r => {
        const res = r[0]
        // clean up the generated SQL
        let sql = `${res['SQL Original Statement']}`;
        if (!options.definer) {
            sql = sql.replace(/CREATE DEFINER=.+?@.+? /, 'CREATE ');
        }
        // drop trigger statement should go outside the delimiter mods
        if (options.dropIfExist) {
            if(node.dbType==DatabaseType.PG){
                sql = `DROP TRIGGER IF EXISTS ${res.Trigger} ${sql.match(/ON \S+/)[0]};\n${sql}`;
            }else{
                sql = `DROP TRIGGER IF EXISTS ${res.Trigger};\n${sql}`;
            }
        }
        return `${sql};`;
    });

    return output.join("\n\n");
}

export { ShowTriggers, ShowCreateTrigger, getTriggerDump };

