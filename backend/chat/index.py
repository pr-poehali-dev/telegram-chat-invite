import json
import os
from typing import Dict, Any, List
from decimal import Decimal
import psycopg2
from psycopg2.extras import RealDictCursor

def decimal_default(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def get_db_connection():
    '''Get database connection using simple query protocol'''
    dsn = os.environ.get('DATABASE_URL')
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для работы с анонимным чатом
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict с данными чата
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            path = event.get('queryStringParameters', {}).get('action', 'messages')
            
            if path == 'messages':
                cur.execute('''
                    SELECT id, nickname, text, 
                           EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
                    FROM messages 
                    ORDER BY created_at ASC
                ''')
                messages = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'messages': messages}, default=str),
                    'isBase64Encoded': False
                }
            
            elif path == 'invitations':
                user_id = event.get('queryStringParameters', {}).get('userId')
                if user_id:
                    cur.execute('''
                        SELECT id, telegram_username, invite_link, status,
                               EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
                        FROM invitations 
                        WHERE created_by = %s
                        ORDER BY created_at DESC
                    ''', (int(user_id),))
                else:
                    cur.execute('''
                        SELECT id, telegram_username, invite_link, status,
                               EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
                        FROM invitations 
                        ORDER BY created_at DESC
                    ''')
                
                invitations = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'invitations': invitations}, default=str),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'register':
                nickname = body.get('nickname', '').strip()
                
                if not nickname:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Nickname required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute('''
                    INSERT INTO users (nickname) 
                    VALUES (%s) 
                    ON CONFLICT (nickname) DO UPDATE SET nickname = EXCLUDED.nickname
                    RETURNING id, nickname
                ''', (nickname,))
                user = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'user': dict(user)}),
                    'isBase64Encoded': False
                }
            
            elif action == 'send_message':
                nickname = body.get('nickname', '').strip()
                text = body.get('text', '').strip()
                user_id = body.get('userId')
                
                if not text or not nickname:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Text and nickname required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute('''
                    INSERT INTO messages (user_id, nickname, text) 
                    VALUES (%s, %s, %s) 
                    RETURNING id, nickname, text
                ''', (user_id, nickname, text))
                message = cur.fetchone()
                
                cur.execute('SELECT EXTRACT(EPOCH FROM created_at) * 1000 FROM messages WHERE id = %s', (message['id'],))
                timestamp_result = cur.fetchone()
                
                conn.commit()
                
                msg_dict = dict(message)
                msg_dict['timestamp'] = float(list(timestamp_result.values())[0])
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': msg_dict}),
                    'isBase64Encoded': False
                }
            
            elif action == 'send_invite':
                telegram_username = body.get('telegramUsername', '').strip().replace('@', '')
                user_id = body.get('userId')
                invite_link = body.get('inviteLink', '')
                
                if not telegram_username:
                    return {
                        'statusCode': 400,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Telegram username required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute('''
                    INSERT INTO invitations (telegram_username, invite_link, created_by) 
                    VALUES (%s, %s, %s) 
                    RETURNING id, telegram_username, invite_link, status, 
                              EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
                ''', (telegram_username, invite_link, user_id))
                invitation = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'invitation': dict(invitation)}, default=decimal_default),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()